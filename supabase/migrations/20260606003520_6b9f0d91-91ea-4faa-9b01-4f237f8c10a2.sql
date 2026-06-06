
-- 1. Add UPDATE policy on generated_documents (owner only)
CREATE POLICY "Docs: update own"
ON public.generated_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Add UPDATE policy on generated_images (owner only)
CREATE POLICY "Images: update own"
ON public.generated_images
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Storage UPDATE policies scoped to user's folder
CREATE POLICY "Generated docs: update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-docs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'generated-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Generated images: update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Revoke EXECUTE on the SECURITY DEFINER trigger function from API roles.
-- handle_new_user is only invoked by the auth.users trigger, never directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
