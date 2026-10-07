CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'scheduler',
  status text NOT NULL DEFAULT 'ok',
  log text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own runs readable" ON public.automation_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX automation_runs_auto_idx ON public.automation_runs(automation_id, created_at DESC);
CREATE INDEX automations_sched_idx ON public.automations(enabled, trigger_type);