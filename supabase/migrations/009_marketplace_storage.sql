-- ============================================================
-- Marketplace Storage Bucket + Policies
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-assets',
  'marketplace-assets',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users upload marketplace assets'
  ) THEN
    CREATE POLICY "Authenticated users upload marketplace assets"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'marketplace-assets'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users manage own marketplace assets'
  ) THEN
    CREATE POLICY "Users manage own marketplace assets"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'marketplace-assets'
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'marketplace-assets'
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users delete own marketplace assets'
  ) THEN
    CREATE POLICY "Users delete own marketplace assets"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'marketplace-assets'
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
      );
  END IF;
END$$;
