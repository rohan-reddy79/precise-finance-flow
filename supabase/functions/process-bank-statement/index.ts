import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { z } from 'https://esm.sh/zod@3.22.4';
import { getDocument, version } from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

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
    const { statementId } = await req.json();
    statementIdRef = statementId;
    console.log('Processing statement:', statementId);

    // Authenticate user
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

    // Verify user token and ownership
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', code: ErrorCodes.UNAUTHORIZED }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify statement ownership
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

    // Update status to processing
    await supabase
      .from('bank_statements')
      .update({ processing_status: 'processing' })
      .eq('id', statementId);

    // Get statement details
    const { data: statement, error: stmtError } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', statementId)
      .single();

    if (stmtError || !statement) {
      console.error('Statement fetch error:', stmtError);
      throw new Error('STATEMENT_ERROR');
    }

    console.log('Downloading file:', statement.file_path);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('bank-statements')
      .download(statement.file_path);

    if (downloadError || !fileData) {
      console.error('File download error:', downloadError);
      throw new Error('FILE_DOWNLOAD_ERROR');
    }

    // Validate file signature (magic bytes)
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (bytes.length < 4) {
      console.error('File too small or corrupted');
      throw new Error('INVALID_FILE_SIGNATURE');
    }

    // Check file signatures
    const isXlsx = bytes[0] === 0x50 && bytes[1] === 0x4B; // XLSX starts with PK (ZIP signature)
    const isXls = bytes[0] === 0xD0 && bytes[1] === 0xCF; // XLS starts with OLE2 signature
    const isCsv = bytes[0] >= 0x20 && bytes[0] <= 0x7E; // CSV starts with printable ASCII
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // PDF starts with %PDF
    
    if (!isXlsx && !isXls && !isCsv && !isPdf) {
      console.error('Invalid file signature detected:', { 
        firstBytes: Array.from(bytes.slice(0, 4)),
        fileType: statement.file_type 
      });
      throw new Error('INVALID_FILE_SIGNATURE');
    }

    console.log('File signature validated:', { isXlsx, isXls, isCsv, isPdf });

    // Parse based on file type
    let transactions: any[] = [];
    let currency = 'USD';
    const fileType = statement.file_type.toLowerCase();

    if (fileType === 'csv' || fileType.includes('spreadsheet') || fileType.includes('excel')) {
      const parseResult = await parseSpreadsheet(fileData);
      transactions = parseResult.transactions;
      currency = parseResult.currency;
    } else if (fileType === 'pdf' || fileType.includes('pdf')) {
      const parseResult = await parsePDF(fileData);
      transactions = parseResult.transactions;
      currency = parseResult.currency;
    } else {
      console.error('Unsupported file type:', fileType);
      throw new Error('UNSUPPORTED_FILE_TYPE');
    }

    console.log(`Parsed ${transactions.length} transactions`);

    if (transactions.length === 0) {
      console.error('No transactions found in file');
      throw new Error('EMPTY_FILE');
    }

    // Get categorization rules for the user
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('*')
      .eq('user_id', statement.user_id)
      .eq('is_active', true);

    // Categorize and insert transactions
    const categorizedTransactions = transactions.map(tx => {
      const category = categorizeTransaction(tx.description, rules || []);
      return {
        user_id: statement.user_id,
        statement_id: statementId,
        transaction_date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount),
        is_debit: tx.amount < 0 || tx.is_debit,
        category: category,
        merchant: extractMerchant(tx.description),
      };
    });

    // Bulk insert transactions
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(categorizedTransactions);

    if (insertError) {
      console.error('Transaction insert error:', insertError);
      throw new Error('INSERT_ERROR');
    }

    // Calculate aggregates
    const totalAmount = categorizedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const dates = categorizedTransactions.map(tx => new Date(tx.transaction_date));
    const periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const periodEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    // Update bank_statements with aggregates
    await supabase
      .from('bank_statements')
      .update({
        processing_status: 'completed',
        total_transactions: transactions.length,
        total_amount: totalAmount,
        statement_period_start: periodStart.toISOString().split('T')[0],
        statement_period_end: periodEnd.toISOString().split('T')[0],
        processed_at: new Date().toISOString(),
        currency: currency,
      })
      .eq('id', statementId);

    console.log('Processing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        transactionsProcessed: transactions.length,
        totalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error details:', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Update status to failed with detailed error
    let errorMessage = 'Processing failed';
    if (error instanceof Error) {
      if (error.message === 'STATEMENT_ERROR') errorMessage = 'Could not access bank statement';
      else if (error.message === 'FILE_DOWNLOAD_ERROR') errorMessage = 'Failed to download file from storage';
      else if (error.message === 'INVALID_FILE_SIGNATURE') errorMessage = 'Invalid file format or corrupted file';
      else if (error.message === 'UNSUPPORTED_FILE_TYPE') errorMessage = 'Unsupported file type';
      else if (error.message === 'EMPTY_FILE') errorMessage = 'No transactions found in the file';
      else if (error.message === 'FILE_TOO_LARGE') errorMessage = 'File size exceeds 10MB limit';
      else if (error.message === 'TOO_MANY_ROWS') errorMessage = 'File contains too many rows (max 10,000)';
      else if (error.message === 'INSERT_ERROR') errorMessage = 'Failed to save transactions to database';
      else if (error.message === 'PDF_PARSING_NOT_SUPPORTED') errorMessage = 'PDF files are not currently supported. Please export your bank statement as CSV or Excel format.';
      else errorMessage = error.message;
    }

    // Try to update statement status
    try {
      if (statementIdRef) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from('bank_statements')
          .update({
            processing_status: 'failed',
            parsing_errors: errorMessage,
          })
          .eq('id', statementIdRef);
        
        console.log(`Updated statement ${statementIdRef} status to failed: ${errorMessage}`);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: ErrorCodes.PROCESSING_FAILED
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function parseSpreadsheet(fileData: Blob): Promise<{ transactions: any[], currency: string }> {
  const arrayBuffer = await fileData.arrayBuffer();
  
  // Validate file size (max 10MB)
  if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE');
  }
  
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { 
    type: 'array',
    cellFormula: false, // Disable formula parsing for security
    cellHTML: false // Disable HTML parsing
  });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  
  // Detect currency from file content
  const allText = JSON.stringify(jsonData).toLowerCase();
  let detectedCurrency = 'USD'; // Default
  
  if (allText.includes('rupee') || allText.includes('inr') || allText.includes('₹') || allText.includes('rs.')) {
    detectedCurrency = 'INR';
  } else if (allText.includes('gbp') || allText.includes('£') || allText.includes('pound')) {
    detectedCurrency = 'GBP';
  } else if (allText.includes('eur') || allText.includes('€') || allText.includes('euro')) {
    detectedCurrency = 'EUR';
  } else if (allText.includes('usd') || allText.includes('$') || allText.includes('dollar')) {
    detectedCurrency = 'USD';
  }

  // Validate row count (max 10,000 rows)
  if (jsonData.length > 10000) {
    throw new Error('TOO_MANY_ROWS');
  }

  const transactions: any[] = [];

  for (const row of jsonData) {
    const rowData: any = row;
    
    // Find date column (case insensitive)
    const dateKey = Object.keys(rowData).find(k => 
      k.toLowerCase().includes('date') || k.toLowerCase().includes('transaction')
    );
    
    // Find amount/debit/credit columns
    const amountKey = Object.keys(rowData).find(k => 
      k.toLowerCase().includes('amount')
    );
    const debitKey = Object.keys(rowData).find(k => 
      k.toLowerCase().includes('debit') || k.toLowerCase().includes('withdrawal')
    );
    const creditKey = Object.keys(rowData).find(k => 
      k.toLowerCase().includes('credit') || k.toLowerCase().includes('deposit')
    );
    
    // Find description column
    const descKey = Object.keys(rowData).find(k => 
      k.toLowerCase().includes('description') || 
      k.toLowerCase().includes('narrative') ||
      k.toLowerCase().includes('details')
    );

    if (!dateKey || !descKey) continue;

    const dateStr = rowData[dateKey];
    const description = rowData[descKey];
    
    let amount = 0;
    let isDebit = false;

    if (debitKey && creditKey) {
      const debitVal = parseAmount(rowData[debitKey]);
      const creditVal = parseAmount(rowData[creditKey]);
      amount = debitVal || creditVal;
      isDebit = debitVal > 0;
    } else if (amountKey) {
      amount = parseAmount(rowData[amountKey]);
      isDebit = amount < 0;
    }

    if (amount === 0) continue;

    const transactionData = {
      date: parseDate(dateStr),
      description: sanitizeString(description?.toString().trim() || 'Unknown'),
      amount: isDebit ? -Math.abs(amount) : Math.abs(amount),
      is_debit: isDebit,
    };

    // Validate transaction data
    const validationResult = TransactionSchema.safeParse(transactionData);
    if (!validationResult.success) {
      console.error('Transaction validation failed:', validationResult.error);
      continue; // Skip invalid transactions
    }

    transactions.push(validationResult.data);
  }

  return { transactions, currency: detectedCurrency };
}

async function parsePDF(fileData: Blob): Promise<{ transactions: any[], currency: string }> {
  try {
    console.log('Starting PDF parsing with PDF.js legacy...');
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`PDF.js version: ${version}`);
    
    const loadingTask = getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    console.log(`PDF loaded: ${pdfDoc.numPages} pages`);
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
    }
    
    console.log(`Total extracted text length: ${fullText.length} characters`);
    
    let currency = 'USD';
    if (fullText.includes('₹') || fullText.includes('INR')) currency = 'INR';
    else if (fullText.includes('$') || fullText.includes('USD')) currency = 'USD';
    else if (fullText.includes('£') || fullText.includes('GBP')) currency = 'GBP';
    else if (fullText.includes('€') || fullText.includes('EUR')) currency = 'EUR';
    
    console.log(`Detected currency: ${currency}`);
    
    const transactions = parseTransactionsFromText(fullText);
    console.log(`Parsed ${transactions.length} transactions from PDF`);
    
    if (transactions.length < 3) {
      throw new Error('Could not extract enough transactions from PDF. Please try CSV or Excel format.');
    }
    
    return { transactions, currency };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseTransactionsFromText(text: string): any[] {
  const transactions: any[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  console.log(`Processing ${lines.length} lines from text`);
  
  const datePatterns = [
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/,
    /(\d{2}\s+[A-Za-z]{3}\s+\d{4})/,
    /(\d{2}\-[A-Za-z]{3}\-\d{4})/,
    /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/
  ];
  
  const amountPattern = /[₹$£€]?\s*[\d,]+\.?\d*/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.toLowerCase().includes('date') && line.toLowerCase().includes('description')) continue;
    if (line.toLowerCase().includes('opening balance') || line.toLowerCase().includes('closing balance')) continue;
    
    let dateMatch = null;
    let dateStr = '';
    
    for (const pattern of datePatterns) {
      dateMatch = line.match(pattern);
      if (dateMatch) {
        dateStr = dateMatch[1];
        break;
      }
    }
    
    if (!dateMatch) continue;
    
    const amounts = line.match(amountPattern);
    if (!amounts || amounts.length === 0) continue;
    
    const dateIndex = line.indexOf(dateStr);
    const firstAmountIndex = line.indexOf(amounts[0]);
    let description = line.substring(dateIndex + dateStr.length, firstAmountIndex).trim();
    
    if (!description || description.length < 2) {
      description = 'Unknown Transaction';
    }
    
    const parsedAmounts = amounts.map(a => parseAmount(a)).filter(a => a > 0);
    if (parsedAmounts.length === 0) continue;
    
    const lineLC = line.toLowerCase();
    const hasDebitKeyword = lineLC.includes('dr') || lineLC.includes('debit') || 
                            lineLC.includes('withdrawal') || lineLC.includes('payment') ||
                            lineLC.includes('wd');
    const hasCreditKeyword = lineLC.includes('cr') || lineLC.includes('credit') || 
                             lineLC.includes('deposit') || lineLC.includes('cd');
    
    let amount = parsedAmounts[0];
    let isDebit = hasDebitKeyword;
    
    if (hasCreditKeyword) {
      isDebit = false;
    } else if (hasDebitKeyword) {
      isDebit = true;
    } else if (parsedAmounts.length >= 2) {
      const firstAmountPos = line.indexOf(amounts[0]);
      const secondAmountPos = line.indexOf(amounts[1]);
      
      if (parsedAmounts[0] > 0 && firstAmountPos < secondAmountPos) {
        isDebit = true;
      } else if (parsedAmounts[1] > 0) {
        amount = parsedAmounts[1];
        isDebit = false;
      }
    }
    
    const parsedDate = parseDate(dateStr);
    if (!parsedDate) continue;
    
    if (amount <= 0 || amount > 10000000) continue;
    
    try {
      const transactionData = {
        date: parsedDate,
        description: sanitizeString(description),
        amount: isDebit ? -Math.abs(amount) : Math.abs(amount),
        is_debit: isDebit,
      };
      
      const validationResult = TransactionSchema.safeParse(transactionData);
      if (validationResult.success) {
        transactions.push(validationResult.data);
      }
    } catch (error) {
      console.log('Error parsing transaction from line:', line);
    }
  }
  
  console.log(`Successfully parsed ${transactions.length} valid transactions`);
  return transactions;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    // Try various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = value.toString();
  // Remove currency symbols, commas, spaces
  const cleaned = str.replace(/[£$€,\s]/g, '');
  
  // Handle parentheses as negative (common in accounting)
  if (cleaned.includes('(') && cleaned.includes(')')) {
    const num = parseFloat(cleaned.replace(/[()]/g, ''));
    return -Math.abs(num);
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function categorizeTransaction(description: string, rules: any[]): string {
  const desc = description.toLowerCase();
  
  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase();
    if (desc.includes(keyword)) {
      return rule.category;
    }
  }
  
  // Default categorization based on keywords
  if (desc.match(/uber|lyft|taxi|train|flight|bus|parking/)) return 'Travel';
  if (desc.match(/school|university|course|tuition|book/)) return 'Education';
  if (desc.match(/netflix|spotify|cinema|concert|game/)) return 'Entertainment';
  if (desc.match(/restaurant|cafe|food|grocery|supermarket/)) return 'Food';
  if (desc.match(/atm|cash|withdrawal/)) return 'ATM';
  
  return 'Miscellaneous';
}

function extractMerchant(description: string): string | null {
  if (!description) return null;
  
  // Extract first few words as potential merchant name
  const words = description.trim().split(/\s+/);
  return sanitizeString(words.slice(0, 3).join(' '));
}

function sanitizeString(input: string): string {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/XSS characters
    .slice(0, 500); // Enforce max length
}
