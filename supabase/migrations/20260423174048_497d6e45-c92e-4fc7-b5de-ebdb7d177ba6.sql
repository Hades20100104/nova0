-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  assistant_name TEXT,
  theme TEXT NOT NULL DEFAULT 'nevira',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: select own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Profiles: insert own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============ USER MEMORY ============
CREATE TABLE public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX idx_user_memory_user ON public.user_memory(user_id);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memory: select own"
  ON public.user_memory FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Memory: insert own"
  ON public.user_memory FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Memory: update own"
  ON public.user_memory FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Memory: delete own"
  ON public.user_memory FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ GENERATED IMAGES ============
CREATE TABLE public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_images_user ON public.generated_images(user_id, created_at DESC);

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Images: select own"
  ON public.generated_images FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Images: insert own"
  ON public.generated_images FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Images: delete own"
  ON public.generated_images FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKET FOR IMAGES ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Images bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Images bucket: users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Images bucket: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );