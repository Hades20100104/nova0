-- Tabla de historial de documentos generados
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('docx','xlsx','pptx')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Docs: select own" ON public.generated_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Docs: insert own" ON public.generated_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Docs: delete own" ON public.generated_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_generated_documents_user_created ON public.generated_documents (user_id, created_at DESC);

-- Bucket privado para archivos descargables
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-docs', 'generated-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Docs storage: select own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'generated-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Docs storage: insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'generated-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Docs storage: delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'generated-docs' AND auth.uid()::text = (storage.foldername(name))[1]);