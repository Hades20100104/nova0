CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  params_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_agent_skills_user ON public.agent_skills(user_id, enabled);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own skills" ON public.agent_skills
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own skills" ON public.agent_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own skills" ON public.agent_skills
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own skills" ON public.agent_skills
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_agent_skills_updated_at
  BEFORE UPDATE ON public.agent_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();