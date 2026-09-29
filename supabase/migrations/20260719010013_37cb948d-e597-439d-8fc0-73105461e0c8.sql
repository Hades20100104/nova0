-- Code artifacts table
CREATE TABLE public.code_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.assistant_threads(id) ON DELETE SET NULL,
  title text NOT NULL,
  language text NOT NULL DEFAULT 'html',
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_artifacts TO authenticated;
GRANT ALL ON public.code_artifacts TO service_role;

ALTER TABLE public.code_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own code_artifacts select" ON public.code_artifacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own code_artifacts insert" ON public.code_artifacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own code_artifacts update" ON public.code_artifacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own code_artifacts delete" ON public.code_artifacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_code_artifacts_updated_at
  BEFORE UPDATE ON public.code_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attachments column on assistant_messages
ALTER TABLE public.assistant_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;