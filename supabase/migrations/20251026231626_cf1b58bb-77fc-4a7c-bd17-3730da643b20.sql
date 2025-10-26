-- Create rate_limits table to track API usage
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limits
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
  ON public.rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
  ON public.rate_limits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add database constraints for project validation
ALTER TABLE public.projects
  ADD CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  ADD CONSTRAINT name_max_length CHECK (length(name) <= 100),
  ADD CONSTRAINT description_max_length CHECK (description IS NULL OR length(description) <= 500);