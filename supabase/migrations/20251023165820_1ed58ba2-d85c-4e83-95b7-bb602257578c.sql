-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Add project_id to bank_statements
ALTER TABLE public.bank_statements 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update RLS policies for bank_statements to check project ownership
DROP POLICY IF EXISTS "Users can view own statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Users can insert own statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Users can update own statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Users can delete own statements" ON public.bank_statements;

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

-- Create project_reports table
CREATE TABLE public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_reports
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.project_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON public.project_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create expense_predictions table
CREATE TABLE public.expense_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prediction_month DATE NOT NULL,
  predicted_amount NUMERIC NOT NULL,
  category transaction_category,
  confidence_score NUMERIC,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expense_predictions
ALTER TABLE public.expense_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predictions"
  ON public.expense_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON public.expense_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();