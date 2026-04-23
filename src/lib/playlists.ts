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
    .select("id, playlist_id, query, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) {
    console.error("fetchTracks", error);
    return [];
  }
  return data ?? [];
}

export async function addTrack(userId: string, playlistId: string, query: string, position: number) {
  const { data, error } = await supabase
    .from("playlist_tracks")
    .insert({ user_id: userId, playlist_id: playlistId, query: query.trim(), position })
    .select("id, playlist_id, query, position")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrack(id: string) {
  const { error } = await supabase.from("playlist_tracks").delete().eq("id", id);
  if (error) throw error;
}
