import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { z } from 'https://esm.sh/zod@3.22.4';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).trim(),
  amount: z.number().min(-1000000).max(1000000),
  is_debit: z.boolean()
});

const ErrorCodes = {
  UNAUTHORIZED: 'E001',
  PROCESSING_FAILED: 'E002',
  INVALID_FILE: 'E003',
  NOT_FOUND: 'E004'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let statementIdRef: string | null = null;
  try {
    const { statementId, reprocess = false } = await req.json();
    statementIdRef = statementId;
    console.log('Processing statement:', statementId, reprocess ? '(REPROCESS)' : '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: ErrorCodes.UNAUTHORIZED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', code: ErrorCodes.UNAUTHORIZED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ownershipCheck, error: ownershipError } = await supabase
      .from('bank_statements')
      .select('user_id')
      .eq('id', statementId)
      .single();

    if (ownershipError || !ownershipCheck) {
      console.error('Statement lookup error:', { statementId, error: ownershipError });
      return new Response(
        JSON.stringify({ error: 'Resource not found', code: ErrorCodes.NOT_FOUND }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ownershipCheck.user_id !== user.id) {
      console.error('Ownership violation attempt:', { statementId, userId: user.id, ownerId: ownershipCheck.user_id });
      return new Response(
        JSON.stringify({ error: 'Resource not found', code: ErrorCodes.NOT_FOUND }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status and reset fields for reprocessing
    const updateFields: any = { 
      processing_status: 'processing',
      parsing_errors: null
    };
    
    if (reprocess) {
      updateFields.statement_period_start = null;
      updateFields.statement_period_end = null;
      updateFields.total_transactions = 0;
      updateFields.total_amount = 0;
    }

    const { error: statusError } = await supabase
      .from('bank_statements')
      .update(updateFields)
      .eq('id', statementId);

    if (statusError) {
      console.error('Status update error:', statusError);
      throw statusError;
    }

    if (reprocess) {
      console.log('Reprocessing: deleting existing transactions...');
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('statement_id', statementId);
      
      if (deleteError) {
        console.error('Error deleting existing transactions:', deleteError);
        throw deleteError;
      }
      console.log('Existing transactions deleted successfully');
    }

    const { data: statement } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', statementId)
      .single();

    if (!statement) {
      throw new Error('Statement not found after ownership verification');
    }

    console.log('Downloading file from storage:', statement.file_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bank-statements')
      .download(statement.file_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileArray = new Uint8Array(fileBuffer);

    const signature = Array.from(fileArray.slice(0, 4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('').toUpperCase();

    console.log('File signature:', signature, 'Type:', statement.file_type);

    let parsedData: { transactions: any[], currency: string | null, period?: { start: string, end: string } };

    if (signature.startsWith('504B03') || signature.startsWith('D0CF11')) {
      console.log('Parsing as spreadsheet...');
      parsedData = parseSpreadsheet(fileArray);
    } else if (signature.startsWith('25504446')) {
      console.log('Parsing as PDF...');
      parsedData = await parsePDF(fileArray);
    } else if (statement.file_type === 'text/csv' || statement.file_name.endsWith('.csv')) {
      console.log('Parsing as CSV...');
      parsedData = parseSpreadsheet(fileArray);
    } else {
      throw new Error(`Unsupported file format. Signature: ${signature}. Please upload CSV, Excel (XLSX/XLS), or PDF files.`);
    }

    console.log(`Parsed ${parsedData.transactions.length} transactions`);
    console.log('Currency detected:', parsedData.currency);

    if (parsedData.transactions.length === 0) {
      throw new Error('No valid transactions found. Please check the file format and content.');
    }

    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('keyword, category')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const categorizationRules = rules || [];

    const transactionsToInsert = parsedData.transactions.map(tx => ({
      user_id: user.id,
      statement_id: statementId,
      transaction_date: tx.date,
      description: tx.description,
      amount: Math.abs(tx.amount),
      is_debit: tx.is_debit,
      merchant: tx.merchant || null,
      category: categorizeTransaction(tx.description, categorizationRules),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Deduplicate
    const uniqueTransactions = deduplicateTransactions(transactionsToInsert);
    console.log(`Inserting ${uniqueTransactions.length} unique transactions (${transactionsToInsert.length - uniqueTransactions.length} duplicates removed)`);

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(uniqueTransactions);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Calculate period from data or use extracted period
    let periodStart: string;
    let periodEnd: string;

    if (parsedData.period) {
      periodStart = parsedData.period.start;
      periodEnd = parsedData.period.end;
      console.log('Using header-extracted period:', periodStart, 'to', periodEnd);
    } else {
      const dates = parsedData.transactions.map(t => t.date).sort();
      periodStart = dates[0];
      periodEnd = dates[dates.length - 1];
      console.log('Using transaction min/max for period:', periodStart, 'to', periodEnd);
    }

    const totalAmount = parsedData.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const { error: updateError } = await supabase
      .from('bank_statements')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        total_transactions: uniqueTransactions.length,
        total_amount: totalAmount,
        statement_period_start: periodStart,
        statement_period_end: periodEnd,
        currency: parsedData.currency || 'USD'
      })
      .eq('id', statementId);

    if (updateError) {
      console.error('Final update error:', updateError);
      throw updateError;
    }

    console.log('Processing completed successfully');
    return new Response(
      JSON.stringify({
        success: true,
        transactionsCount: uniqueTransactions.length,
        periodStart,
        periodEnd
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Processing error:', error);
    
    if (statementIdRef) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('bank_statements')
        .update({
          processing_status: 'failed',
          parsing_errors: error.message
        })
        .eq('id', statementIdRef);
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Processing failed',
        code: ErrorCodes.PROCESSING_FAILED,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseSpreadsheet(fileArray: Uint8Array): { transactions: any[], currency: string | null } {
  const workbook = XLSX.read(fileArray, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length > 10000) {
    throw new Error('File too large. Maximum 10,000 rows allowed.');
  }

  const allText = rawData.slice(0, 50).flat().join(' ').toUpperCase();
  const currency = detectCurrency(allText);

  const transactions: any[] = [];
  let dateCol = -1, descCol = -1, amountCol = -1, debitCol = -1, creditCol = -1;

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;

    row.forEach((cell, idx) => {
      const cellStr = String(cell || '').toLowerCase();
      if (cellStr.includes('date') && dateCol === -1) dateCol = idx;
      if ((cellStr.includes('description') || cellStr.includes('narration') || cellStr.includes('particulars')) && descCol === -1) descCol = idx;
      if (cellStr.includes('amount') && amountCol === -1) amountCol = idx;
      if (cellStr.includes('debit') && debitCol === -1) debitCol = idx;
      if (cellStr.includes('credit') && creditCol === -1) creditCol = idx;
    });

    if (dateCol !== -1 && descCol !== -1 && (amountCol !== -1 || (debitCol !== -1 && creditCol !== -1))) {
      console.log(`Columns detected at row ${i}: date=${dateCol}, desc=${descCol}, amount=${amountCol}, debit=${debitCol}, credit=${creditCol}`);
      break;
    }
  }

  if (dateCol === -1 || descCol === -1 || (amountCol === -1 && debitCol === -1)) {
    throw new Error('Could not identify required columns (Date, Description, Amount) in the spreadsheet.');
  }

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const dateRaw = row[dateCol];
    const desc = String(row[descCol] || '').trim();
    let amount: number | null = null;
    let isDebit = true;

    if (amountCol !== -1) {
      const amtStr = String(row[amountCol] || '').trim();
      amount = parseAmount(amtStr);
    } else if (debitCol !== -1 && creditCol !== -1) {
      const debitStr = String(row[debitCol] || '').trim();
      const creditStr = String(row[creditCol] || '').trim();
      const debitAmt = parseAmount(debitStr);
      const creditAmt = parseAmount(creditStr);
      
      if (debitAmt !== null) {
        amount = debitAmt;
        isDebit = true;
      } else if (creditAmt !== null) {
        amount = creditAmt;
        isDebit = false;
      }
    }

    if (!amount || amount === 0 || !desc) continue;

    const parsedDate = parseDate(String(dateRaw || ''), null);
    if (!parsedDate) continue;

    const merchant = extractMerchant(desc);

    try {
      TransactionSchema.parse({
        date: parsedDate,
        description: desc,
        amount,
        is_debit: isDebit
      });

      transactions.push({
        date: parsedDate,
        description: desc,
        amount,
        is_debit: isDebit,
        merchant
      });
    } catch (e) {
      // Skip invalid
    }
  }

  return { transactions, currency };
}

async function parsePDF(fileArray: Uint8Array): Promise<{ transactions: any[], currency: string | null, period?: { start: string, end: string } }> {
  const pdf = await getDocument({ data: fileArray }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  
  console.log(`PDF has ${pdf.numPages} pages, processing first ${maxPages}`);

  let fullText = '';
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  console.log(`Extracted ${fullText.length} characters from PDF`);

  const currency = detectCurrency(fullText);
  
  // Extract period from first ~2000 chars
  const header = fullText.substring(0, 2000);
  const period = extractStatementPeriod(header);
  
  if (period) {
    console.log('✓ Header period extracted:', period);
  } else {
    console.log('⚠ No header period found, will use transaction min/max');
  }

  const transactions = parseTransactionsFromText(fullText, period?.end);

  return { transactions, currency, period: period || undefined };
}

function extractStatementPeriod(header: string): { start: string, end: string } | null {
  // Try various period patterns
  const patterns = [
    /statement\s+period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /from\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|through)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /period[:\s]+(\w+\s+\d{1,2},?\s+\d{4})\s+(?:to|through|-)\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*-\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  ];

  for (const pattern of patterns) {
    const match = header.match(pattern);
    if (match) {
      const start = parseDate(match[1], null);
      const end = parseDate(match[2], null);
      if (start && end) {
        return { start, end };
      }
    }
  }

  return null;
}

function parseTransactionsFromText(text: string, yearHint?: string): any[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  
  console.log(`Parsing ${lines.length} lines from text`);

  const skipPatterns = [
    /^(statement|account|page|date|description|amount|balance|transaction|debit|credit|opening|closing|total|subtotal|continued|brought forward|carried forward)/i,
    /^\d+\s*$/,
    /^[a-z\s]{30,}$/i,
    /statement\s+period/i,
    /^balance\s+as\s+of/i,
    /^\s*$/
  ];

  // Phase A: Strict - date must be at start
  const strictTransactions = [];
  const strictDatePatterns = [
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /^(\w{3}\s+\d{1,2},?\s+\d{4})/,
    /^(\d{1,2}\s+\w{3}\s+\d{4})/
  ];

  let scanned = 0, skipped = 0, matched = 0, rejectedDate = 0;

  for (const line of lines) {
    scanned++;
    
    if (skipPatterns.some(p => p.test(line))) {
      skipped++;
      continue;
    }

    let dateMatch: RegExpMatchArray | null = null;
    let dateStr = '';
    
    for (const pattern of strictDatePatterns) {
      dateMatch = line.match(pattern);
      if (dateMatch) {
        dateStr = dateMatch[1];
        break;
      }
    }

    if (!dateStr) continue;

    // Extract final amount
    const amountMatch = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s*(?:DR|CR|debit|credit)?)?$/i);
    if (!amountMatch) continue;

    const amountStr = amountMatch[1];
    const amount = parseAmount(amountStr);
    if (!amount || amount === 0) continue;

    // Text between date and amount
    const dateEndIdx = line.indexOf(dateStr) + dateStr.length;
    const amountStartIdx = line.indexOf(amountStr);
    if (amountStartIdx <= dateEndIdx) continue;

    const desc = line.substring(dateEndIdx, amountStartIdx).trim();
    if (desc.length < 3) continue;

    const parsedDate = parseDate(dateStr, yearHint || null);
    if (!parsedDate) {
      rejectedDate++;
      continue;
    }

    const cleanDesc = cleanDescription(desc);
    const merchant = extractMerchant(cleanDesc);
    const isDebit = detectIsDebit(line, amount);

    try {
      TransactionSchema.parse({
        date: parsedDate,
        description: cleanDesc,
        amount,
        is_debit: isDebit
      });

      strictTransactions.push({
        date: parsedDate,
        description: cleanDesc,
        amount,
        is_debit: isDebit,
        merchant
      });
      matched++;
    } catch (e) {
      // Invalid
    }
  }

  console.log(`Phase A (strict): scanned=${scanned}, skipped=${skipped}, matched=${matched}, rejectedDate=${rejectedDate}`);

  if (strictTransactions.length >= 5) {
    console.log('Phase A succeeded with', strictTransactions.length, 'transactions');
    console.log('Sample transactions:', strictTransactions.slice(0, 3).map(t => ({ date: t.date, desc: t.description.substring(0, 30), amount: t.amount })));
    return strictTransactions;
  }

  // Phase B: Flexible - date anywhere, but controlled distance to amount
  console.log('Phase A yielded too few, trying Phase B (flexible)...');
  
  const flexibleTransactions = [];
  const flexDatePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /(\w{3}\s+\d{1,2},?\s+\d{4})/g,
    /(\d{1,2}\s+\w{3}\s+\d{4})/g
  ];

  for (const line of lines) {
    if (skipPatterns.some(p => p.test(line))) continue;

    const amountMatch = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s*(?:DR|CR|debit|credit)?)?$/i);
    if (!amountMatch) continue;

    const amountStr = amountMatch[1];
    const amount = parseAmount(amountStr);
    if (!amount || amount === 0) continue;

    const amountStartIdx = line.indexOf(amountStr);

    // Find all dates
    const dateMatches: Array<{ str: string, idx: number }> = [];
    for (const pattern of flexDatePatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        dateMatches.push({ str: match[1], idx: match.index });
      }
    }

    if (dateMatches.length === 0) continue;

    // Choose date nearest and left of amount
    const validDates = dateMatches.filter(d => d.idx < amountStartIdx && (amountStartIdx - d.idx) <= 60);
    if (validDates.length === 0) continue;

    validDates.sort((a, b) => b.idx - a.idx); // nearest first
    const chosenDate = validDates[0];

    const parsedDate = parseDate(chosenDate.str, yearHint || null);
    if (!parsedDate) continue;

    const dateEndIdx = chosenDate.idx + chosenDate.str.length;
    const desc = line.substring(dateEndIdx, amountStartIdx).trim();
    if (desc.length < 3) continue;

    const cleanDesc = cleanDescription(desc);
    const merchant = extractMerchant(cleanDesc);
    const isDebit = detectIsDebit(line, amount);

    try {
      TransactionSchema.parse({
        date: parsedDate,
        description: cleanDesc,
        amount,
        is_debit: isDebit
      });

      flexibleTransactions.push({
        date: parsedDate,
        description: cleanDesc,
        amount,
        is_debit: isDebit,
        merchant
      });
    } catch (e) {
      // Invalid
    }
  }

  console.log('Phase B yielded', flexibleTransactions.length, 'transactions');
  console.log('Sample transactions:', flexibleTransactions.slice(0, 3).map(t => ({ date: t.date, desc: t.description.substring(0, 30), amount: t.amount })));

  return flexibleTransactions.length > 0 ? flexibleTransactions : strictTransactions;
}

function parseDate(dateStr: string, yearHint: string | null): string | null {
  if (!dateStr) return null;

  dateStr = dateStr.trim();

  const now = new Date();
  const currentYear = now.getFullYear();
  const twoYearsAgo = new Date(currentYear - 2, 0, 1);
  const oneMonthAhead = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const formats = [
    // MM/DD/YYYY or MM-DD-YYYY
    { pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, order: 'mdy' },
    // DD/MM/YYYY or DD-MM-YYYY
    { pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, order: 'dmy' },
    // YYYY-MM-DD
    { pattern: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, order: 'ymd' },
    // MM/DD/YY or MM-DD-YY
    { pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, order: 'mdy2' },
    // Month DD, YYYY (e.g., Nov 14, 2024)
    { pattern: /^(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})$/, order: 'mdy_text' },
    // DD Month YYYY (e.g., 14 Nov 2024)
    { pattern: /^(\d{1,2})\s+(\w{3,9})\s+(\d{4})$/, order: 'dmy_text' },
    // Month DD (no year)
    { pattern: /^(\w{3,9})\s+(\d{1,2})$/, order: 'md_text' },
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt.pattern);
    if (!match) continue;

    let year: number, month: number, day: number;

    if (fmt.order === 'ymd') {
      year = parseInt(match[1]);
      month = parseInt(match[2]);
      day = parseInt(match[3]);
    } else if (fmt.order === 'mdy') {
      month = parseInt(match[1]);
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    } else if (fmt.order === 'dmy') {
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = parseInt(match[3]);
    } else if (fmt.order === 'mdy2') {
      month = parseInt(match[1]);
      day = parseInt(match[2]);
      let yy = parseInt(match[3]);
      year = yy < 50 ? 2000 + yy : 1900 + yy;
    } else if (fmt.order === 'mdy_text') {
      month = parseMonth(match[1]);
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    } else if (fmt.order === 'dmy_text') {
      day = parseInt(match[1]);
      month = parseMonth(match[2]);
      year = parseInt(match[3]);
    } else if (fmt.order === 'md_text') {
      month = parseMonth(match[1]);
      day = parseInt(match[2]);
      // Use yearHint
      if (yearHint) {
        const hintDate = new Date(yearHint);
        year = hintDate.getFullYear();
      } else {
        year = currentYear;
      }
    } else {
      continue;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    const parsed = new Date(year, month - 1, day);
    if (isNaN(parsed.getTime())) continue;

    // Sanity checks
    if (parsed < twoYearsAgo || parsed > oneMonthAhead) {
      continue;
    }

    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  return months[monthStr.toLowerCase()] || 0;
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  let str = amountStr.replace(/[^0-9.\-(),]/g, '');
  
  // Handle parentheses as negative
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.substring(1, str.length - 1);
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function detectIsDebit(line: string, amount: number): boolean {
  const lower = line.toLowerCase();
  
  if (/\bdr\b|\bdebit\b|\bwithdrawal\b|\bpayment\b|\bwd\b/.test(lower)) {
    return true;
  }
  if (/\bcr\b|\bcredit\b|\bdeposit\b|\brefund\b/.test(lower) && amount >= 0) {
    return false;
  }
  
  return amount >= 0; // default
}

function cleanDescription(desc: string): string {
  let cleaned = desc.trim();
  
  // Remove trailing reference numbers
  cleaned = cleaned.replace(/\s+\d{4,}$/, '');
  
  // Remove redundant date tokens
  cleaned = cleaned.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '');
  
  // Remove generic keywords at end
  cleaned = cleaned.replace(/\s+(PURCHASE|DEBIT|ATM|TRANSFER|POS|ACH|CHECK|CREDIT|CARD|TRANSACTION)\s*$/gi, '');
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (!cleaned) {
    cleaned = 'Transaction';
  }
  
  return cleaned.substring(0, 500);
}

function extractMerchant(description: string): string | null {
  const words = description.split(/\s+/).filter(w => w.length > 0);
  const merchant = words.slice(0, 3).join(' ');
  return merchant.length > 0 ? merchant : null;
}

function detectCurrency(text: string): string | null {
  const upper = text.toUpperCase();
  if (upper.includes('USD') || upper.includes('$')) return 'USD';
  if (upper.includes('EUR') || upper.includes('€')) return 'EUR';
  if (upper.includes('GBP') || upper.includes('£')) return 'GBP';
  if (upper.includes('INR') || upper.includes('₹') || upper.includes('RUPEE')) return 'INR';
  return null;
}

function categorizeTransaction(description: string, userRules: any[]): string {
  const desc = description.toLowerCase();
  
  for (const rule of userRules) {
    if (desc.includes(rule.keyword.toLowerCase())) {
      return rule.category;
    }
  }
  
  const categories: Record<string, string[]> = {
    Travel: ['flight', 'hotel', 'uber', 'lyft', 'taxi', 'airline', 'booking', 'airbnb', 'train', 'bus', 'rental car'],
    Education: ['tuition', 'school', 'university', 'college', 'course', 'udemy', 'coursera', 'books', 'library'],
    Entertainment: ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'cinema', 'theater', 'concert', 'game', 'steam'],
    Food: ['restaurant', 'food', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'pizza', 'grocery', 'supermarket', 'dining'],
    ATM: ['atm', 'cash withdrawal', 'withdrawal']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  
  return 'Miscellaneous';
}

function deduplicateTransactions(transactions: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  
  for (const tx of transactions) {
    const normalized = tx.description.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = `${tx.transaction_date}|${normalized}|${Math.abs(tx.amount)}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tx);
    }
  }
  
  return unique;
}
