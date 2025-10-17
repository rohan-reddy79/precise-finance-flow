import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { statementId } = await req.json();
    console.log('Processing statement:', statementId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      throw new Error('Statement not found');
    }

    console.log('Downloading file:', statement.file_path);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('bank-statements')
      .download(statement.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file');
    }

    // Parse based on file type
    let transactions: any[] = [];
    const fileType = statement.file_type.toLowerCase();

    if (fileType === 'csv' || fileType.includes('spreadsheet') || fileType.includes('excel')) {
      transactions = await parseSpreadsheet(fileData);
    } else if (fileType === 'pdf' || fileType.includes('pdf')) {
      transactions = await parsePDF(fileData);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log(`Parsed ${transactions.length} transactions`);

    if (transactions.length === 0) {
      throw new Error('No transactions found in file');
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
      throw new Error(`Failed to insert transactions: ${insertError.message}`);
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
    console.error('Processing error:', error);

    // Update status to failed if we have statementId
    try {
      const { statementId } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('bank_statements')
        .update({
          processing_status: 'failed',
          parsing_errors: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', statementId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function parseSpreadsheet(fileData: Blob): Promise<any[]> {
  const arrayBuffer = await fileData.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

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

    transactions.push({
      date: parseDate(dateStr),
      description: description?.toString().trim() || 'Unknown',
      amount: isDebit ? -Math.abs(amount) : Math.abs(amount),
      is_debit: isDebit,
    });
  }

  return transactions;
}

async function parsePDF(fileData: Blob): Promise<any[]> {
  // For PDF parsing, we would need pdf-parse or similar
  // For now, return an error suggesting CSV/XLSX format
  throw new Error('PDF parsing not yet implemented. Please upload CSV or XLSX format.');
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
  return words.slice(0, 3).join(' ');
}
