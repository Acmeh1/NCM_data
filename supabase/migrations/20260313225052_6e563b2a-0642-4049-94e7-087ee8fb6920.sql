
-- Allow authenticated users to read/download from database-backups bucket
CREATE POLICY "Authenticated users can read backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'database-backups');
