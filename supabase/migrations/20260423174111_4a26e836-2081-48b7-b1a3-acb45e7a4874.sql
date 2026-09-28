-- Reemplazar política de SELECT pública por una restringida al dueño
DROP POLICY IF EXISTS "Images bucket: public read" ON storage.objects;

CREATE POLICY "Images bucket: users read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Hacer el bucket privado (las URLs públicas seguirán funcionando solo si firmamos)
UPDATE storage.buckets SET public = false WHERE id = 'generated-images';