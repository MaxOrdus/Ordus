-- ============================================
-- ORDUS STORAGE POLICIES
-- Run this AFTER creating the 'documents' bucket in Storage
-- ============================================

-- Storage policies for documents bucket
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own firm documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.file_path = name
    AND documents.firm_id = get_user_firm_id()
  )
);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.file_path = name
    AND documents.firm_id = get_user_firm_id()
  )
);

CREATE POLICY "Lawyers can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.file_path = name
    AND documents.firm_id = get_user_firm_id()
    AND EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'Lawyer'
    )
  )
);

