-- Add more transaction categories including Loans
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Loan';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Salary';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Investment';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Insurance';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Utilities';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Healthcare';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Shopping';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Transfer';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Fee';
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'Tax';