-- Contactos de WhatsApp
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_contacts_user ON public.whatsapp_contacts(user_id);
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts: select own" ON public.whatsapp_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Contacts: insert own" ON public.whatsapp_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contacts: update own" ON public.whatsapp_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Contacts: delete own" ON public.whatsapp_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Playlists
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_playlists_user ON public.playlists(user_id);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlists: select own" ON public.playlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Playlists: insert own" ON public.playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Playlists: update own" ON public.playlists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Playlists: delete own" ON public.playlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tracks dentro de cada playlist
CREATE TABLE public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  query text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id, position);
CREATE INDEX idx_playlist_tracks_user ON public.playlist_tracks(user_id);
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PlaylistTracks: select own" ON public.playlist_tracks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "PlaylistTracks: insert own" ON public.playlist_tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "PlaylistTracks: update own" ON public.playlist_tracks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "PlaylistTracks: delete own" ON public.playlist_tracks FOR DELETE TO authenticated USING (auth.uid() = user_id);