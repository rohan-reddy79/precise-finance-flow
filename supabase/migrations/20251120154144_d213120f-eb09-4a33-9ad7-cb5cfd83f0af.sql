-- Add balance tracking columns to bank_statements table
ALTER TABLE public.bank_statements
ADD COLUMN opening_balance numeric,
ADD COLUMN closing_balance numeric;

-- Add helpful comment
COMMENT ON COLUMN public.bank_statements.opening_balance IS 'Starting balance at the beginning of the statement period';
COMMENT ON COLUMN public.bank_statements.closing_balance IS 'Ending balance at the end of the statement period';