CREATE TABLE IF NOT EXISTS public.spotify_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  spotify_user_id TEXT,
  spotify_display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spotify connections: select own"
ON public.spotify_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Spotify connections: insert own"
ON public.spotify_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Spotify connections: update own"
ON public.spotify_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Spotify connections: delete own"
ON public.spotify_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spotify_connections_user_id ON public.spotify_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_connections_spotify_user_id ON public.spotify_connections(spotify_user_id);

CREATE TRIGGER update_spotify_connections_updated_at
BEFORE UPDATE ON public.spotify_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nevira_color TEXT NOT NULL DEFAULT 'aqua',
ADD COLUMN IF NOT EXISTS nova_color TEXT NOT NULL DEFAULT 'violet';