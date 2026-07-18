
-- user_sections
CREATE TABLE public.user_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assistant text NOT NULL CHECK (assistant IN ('nova','nevira')),
  slug text NOT NULL,
  label text NOT NULL,
  icon text,
  accent text,
  layout jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  created_by text NOT NULL DEFAULT 'user' CHECK (created_by IN ('user','ai')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sections TO authenticated;
GRANT ALL ON public.user_sections TO service_role;
ALTER TABLE public.user_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own sections select" ON public.user_sections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sections insert" ON public.user_sections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sections update" ON public.user_sections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sections delete" ON public.user_sections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_sections_updated_at
BEFORE UPDATE ON public.user_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- section_events
CREATE TABLE public.section_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('suggest','used','dismissed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_events TO authenticated;
GRANT ALL ON public.section_events TO service_role;
ALTER TABLE public.section_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own events select" ON public.section_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.section_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events update" ON public.section_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events delete" ON public.section_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- link skills to sections
ALTER TABLE public.agent_skills ADD COLUMN IF NOT EXISTS section_slug text;
CREATE INDEX IF NOT EXISTS agent_skills_user_section_idx ON public.agent_skills(user_id, section_slug);
