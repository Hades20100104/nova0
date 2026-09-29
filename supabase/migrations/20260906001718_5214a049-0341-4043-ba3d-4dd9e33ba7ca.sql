ALTER TABLE public.merlin_concepts
  ADD COLUMN IF NOT EXISTS curriculum_unit text,
  ADD COLUMN IF NOT EXISTS difficulty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS prerequisites text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS strategy_key text,
  ADD COLUMN IF NOT EXISTS breakdown text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.merlin_evidence
  ADD COLUMN IF NOT EXISTS result text NOT NULL DEFAULT 'parcial',
  ADD COLUMN IF NOT EXISTS context text;

ALTER TABLE public.merlin_strategies
  ADD COLUMN IF NOT EXISTS result text NOT NULL DEFAULT 'activa',
  ADD COLUMN IF NOT EXISTS context text,
  ADD COLUMN IF NOT EXISTS effectiveness integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.merlin_routes
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'media';

CREATE TABLE IF NOT EXISTS public.merlin_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  confidence integer NOT NULL DEFAULT 60,
  importance text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_memory TO authenticated;
GRANT ALL ON public.merlin_memory TO service_role;
ALTER TABLE public.merlin_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own merlin memory" ON public.merlin_memory
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.merlin_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  motive text NOT NULL,
  evidence text NOT NULL,
  confidence integer NOT NULL DEFAULT 60,
  action text NOT NULL,
  expected text NOT NULL,
  outcome text NOT NULL DEFAULT 'observando',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_decisions TO authenticated;
GRANT ALL ON public.merlin_decisions TO service_role;
ALTER TABLE public.merlin_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own merlin decisions" ON public.merlin_decisions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_merlin_memory_updated_at BEFORE UPDATE ON public.merlin_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merlin_decisions_updated_at BEFORE UPDATE ON public.merlin_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();