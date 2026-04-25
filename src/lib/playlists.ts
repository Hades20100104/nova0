import { supabase } from "@/integrations/supabase/client";

export interface Playlist {
  id: string;
  name: string;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  query: string;
  position: number;
  spotify_uri?: string | null;
  spotify_track_id?: string | null;
  spotify_artist?: string | null;
  spotify_album?: string | null;
  cover_url?: string | null;
}

export interface PlaylistTrackInput {
  query: string;
  spotify_uri?: string | null;
  spotify_track_id?: string | null;
  spotify_artist?: string | null;
  spotify_album?: string | null;
  cover_url?: string | null;
}

export async function fetchPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchPlaylists", error);
    return [];
  }
  return data ?? [];
}

export async function createPlaylist(userId: string, name: string): Promise<Playlist> {
  const { data, error } = await supabase
    .from("playlists")
    .insert({ user_id: userId, name: name.trim() })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlaylist(id: string) {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const { data, error } = await supabase
    .from("playlist_tracks")
    .select("id, playlist_id, query, position, spotify_uri, spotify_track_id, spotify_artist, spotify_album, cover_url")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) {
    console.error("fetchTracks", error);
    return [];
  }
  return data ?? [];
}

export async function addTrack(userId: string, playlistId: string, input: string | PlaylistTrackInput, position: number) {
  const track = typeof input === "string" ? { query: input } : input;
  const { data, error } = await supabase
    .from("playlist_tracks")
    .insert({
      user_id: userId,
      playlist_id: playlistId,
      query: track.query.trim(),
      position,
      spotify_uri: track.spotify_uri ?? null,
      spotify_track_id: track.spotify_track_id ?? null,
      spotify_artist: track.spotify_artist ?? null,
      spotify_album: track.spotify_album ?? null,
      cover_url: track.cover_url ?? null,
    } as any)
    .select("id, playlist_id, query, position, spotify_uri, spotify_track_id, spotify_artist, spotify_album, cover_url")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrack(id: string) {
  const { error } = await supabase.from("playlist_tracks").delete().eq("id", id);
  if (error) throw error;
}
