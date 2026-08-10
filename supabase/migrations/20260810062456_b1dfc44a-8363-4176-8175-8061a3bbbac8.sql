
-- MERLIN educational brain
CREATE TABLE public.merlin_access (
  user_id uuid PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.merlin_access TO authenticated;
GRANT ALL ON public.merlin_access TO service_role;
ALTER TABLE public.merlin_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own merlin access" ON public.merlin_access FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.merlin_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  curriculum text,
  level text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_subjects TO authenticated;
GRANT ALL ON public.merlin_subjects TO service_role;
ALTER TABLE public.merlin_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects" ON public.merlin_subjects FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_subjects_updated_at BEFORE UPDATE ON public.merlin_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merlin_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  area text,
  summary text,
  status text NOT NULL DEFAULT 'not_started',
  mastery jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'media',
  position jsonb,
  last_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_concepts TO authenticated;
GRANT ALL ON public.merlin_concepts TO service_role;
ALTER TABLE public.merlin_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own concepts" ON public.merlin_concepts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_concepts_updated_at BEFORE UPDATE ON public.merlin_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX merlin_concepts_subject_idx ON public.merlin_concepts(subject_id);

CREATE TABLE public.merlin_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  from_concept uuid NOT NULL REFERENCES public.merlin_concepts(id) ON DELETE CASCADE,
  to_concept uuid NOT NULL REFERENCES public.merlin_concepts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'prerequisite',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_relations TO authenticated;
GRANT ALL ON public.merlin_relations TO service_role;
ALTER TABLE public.merlin_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relations" ON public.merlin_relations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.merlin_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  concept_id uuid REFERENCES public.merlin_concepts(id) ON DELETE CASCADE,
  agent text NOT NULL,
  kind text NOT NULL DEFAULT 'observation',
  summary text NOT NULL,
  hypothesis text,
  correct boolean,
  confidence numeric NOT NULL DEFAULT 50,
  importance text NOT NULL DEFAULT 'media',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_evidence TO authenticated;
GRANT ALL ON public.merlin_evidence TO service_role;
ALTER TABLE public.merlin_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evidence" ON public.merlin_evidence FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX merlin_evidence_concept_idx ON public.merlin_evidence(concept_id);

CREATE TABLE public.merlin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  concept_id uuid REFERENCES public.merlin_concepts(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'aprender',
  strategy text,
  minutes integer NOT NULL DEFAULT 0,
  score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_sessions TO authenticated;
GRANT ALL ON public.merlin_sessions TO service_role;
ALTER TABLE public.merlin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.merlin_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.merlin_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_kind text NOT NULL,
  strategy text NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 50,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_strategies TO authenticated;
GRANT ALL ON public.merlin_strategies TO service_role;
ALTER TABLE public.merlin_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategies" ON public.merlin_strategies FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_strategies_updated_at BEFORE UPDATE ON public.merlin_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merlin_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'dominio',
  target_date date,
  progress numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_goals TO authenticated;
GRANT ALL ON public.merlin_goals TO service_role;
ALTER TABLE public.merlin_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own merlin goals" ON public.merlin_goals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_goals_updated_at BEFORE UPDATE ON public.merlin_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merlin_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.merlin_subjects(id) ON DELETE CASCADE,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  confidence numeric NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_routes TO authenticated;
GRANT ALL ON public.merlin_routes TO service_role;
ALTER TABLE public.merlin_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routes" ON public.merlin_routes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_routes_updated_at BEFORE UPDATE ON public.merlin_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merlin_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_id uuid NOT NULL REFERENCES public.merlin_concepts(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendiente',
  question text,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_recalls TO authenticated;
GRANT ALL ON public.merlin_recalls TO service_role;
ALTER TABLE public.merlin_recalls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recalls" ON public.merlin_recalls FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.merlin_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.merlin_subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'apunte',
  content text,
  summary text,
  concepts text[] NOT NULL DEFAULT '{}',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merlin_documents TO authenticated;
GRANT ALL ON public.merlin_documents TO service_role;
ALTER TABLE public.merlin_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own merlin docs" ON public.merlin_documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER merlin_documents_updated_at BEFORE UPDATE ON public.merlin_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
