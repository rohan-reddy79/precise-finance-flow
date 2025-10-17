-- Add processing status fields to bank_statements table
ALTER TABLE public.bank_statements 
ADD COLUMN processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN parsing_errors text,
ADD COLUMN processed_at timestamp with time zone;