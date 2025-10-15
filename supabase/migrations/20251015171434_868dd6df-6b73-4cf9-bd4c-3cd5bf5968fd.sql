-- Create enum for transaction categories
CREATE TYPE public.transaction_category AS ENUM (
  'Travel',
  'Education',
  'Entertainment',
  'Food',
  'Miscellaneous',
  'ATM'
);

-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create table for uploaded bank statements
CREATE TABLE public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  statement_period_start DATE,
  statement_period_end DATE,
  total_transactions INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statements"
  ON public.bank_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements"
  ON public.bank_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements"
  ON public.bank_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements"
  ON public.bank_statements FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category public.transaction_category DEFAULT 'Miscellaneous',
  subcategory TEXT,
  merchant TEXT,
  notes TEXT,
  is_debit BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_statement ON public.transactions(statement_id);
CREATE INDEX idx_transactions_category ON public.transactions(category);

-- Create table for categorization rules
CREATE TABLE public.categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category public.transaction_category NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, keyword)
);

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
  ON public.categorization_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
  ON public.categorization_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON public.categorization_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON public.categorization_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_statements_updated_at
  BEFORE UPDATE ON public.bank_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categorization_rules_updated_at
  BEFORE UPDATE ON public.categorization_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for bank statements
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-statements', 'bank-statements', false);

-- Storage policies
CREATE POLICY "Users can upload own statements"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bank-statements' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own statements"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bank-statements' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own statements"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bank-statements' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own statements"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bank-statements' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );