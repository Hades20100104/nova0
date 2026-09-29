ALTER TABLE public.playlist_tracks
ADD COLUMN IF NOT EXISTS spotify_uri TEXT,
ADD COLUMN IF NOT EXISTS spotify_track_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_artist TEXT,
ADD COLUMN IF NOT EXISTS spotify_album TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_spotify_track_id ON public.playlist_tracks(spotify_track_id);