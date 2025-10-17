-- Create storage policies for bank-statements bucket
-- Allow users to upload their own files
CREATE POLICY "Users can upload own bank statements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view own bank statements"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own bank statements"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);