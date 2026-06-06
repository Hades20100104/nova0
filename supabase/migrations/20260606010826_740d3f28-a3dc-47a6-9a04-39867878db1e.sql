
CREATE TABLE public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant text NOT NULL CHECK (assistant IN ('nova','nevira')),
  module text NOT NULL DEFAULT 'home',
  title text NOT NULL DEFAULT 'Nueva conversación',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_threads_user_updated ON public.assistant_threads(user_id, assistant, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;
GRANT ALL ON public.assistant_threads TO service_role;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage their own threads" ON public.assistant_threads
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_messages_thread_created ON public.assistant_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage messages in their threads" ON public.assistant_messages
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
