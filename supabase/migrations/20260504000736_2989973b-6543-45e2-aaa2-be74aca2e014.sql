CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  last_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automations: select own" ON public.automations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Automations: insert own" ON public.automations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Automations: update own" ON public.automations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Automations: delete own" ON public.automations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automations_user_enabled ON public.automations(user_id, enabled);