-- Add currency field to bank_statements
ALTER TABLE bank_statements 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Add currency field to project_reports report_data
COMMENT ON COLUMN project_reports.report_data IS 'JSONB containing: summary, insights, patterns, recommendations, healthScore, totalIncome, totalExpenses, categoryBreakdown, monthlyTrends, transactionCount, currency';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_statements_currency ON bank_statements(currency);