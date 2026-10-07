import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export class SpotifyError extends Error {
  constructor(public code: "not_connected" | "no_device" | "premium_required" | "api", message: string) {
    super(message);
  }
}

/** Returns a valid user access token, refreshing (single write) when expired. */
export async function getUserToken(supabase: SB, userId: string): Promise<string> {
  const { data } = await supabase
    .from("spotify_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new SpotifyError("not_connected", "Spotify no está conectado");
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token;
  if (!data.refresh_token) throw new SpotifyError("not_connected", "Vuelve a conectar Spotify");

  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: data.refresh_token }).toString(),
  });
  if (!res.ok) throw new SpotifyError("not_connected", "La sesión de Spotify expiró. Vuelve a conectar.");
  const tok = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  await supabase
    .from("spotify_connections")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? data.refresh_token,
      expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return tok.access_token;
}

export async function spotifyApi<T = unknown>(token: string, path: string, init: RequestInit = {}): Promise<T | null> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204 || res.status === 202) return null;
  if (res.status === 404) throw new SpotifyError("no_device", "No hay un dispositivo activo. Abre Spotify en tu teléfono o computadora.");
  if (res.status === 403) {
    const t = await res.text();
    if (/premium/i.test(t)) throw new SpotifyError("premium_required", "Controlar la reproducción requiere Spotify Premium.");
    throw new SpotifyError("api", "Spotify rechazó la acción. Reconecta tu cuenta para dar permisos nuevos.");
  }
  if (res.status === 401) throw new SpotifyError("not_connected", "Vuelve a conectar Spotify");
  if (!res.ok) throw new SpotifyError("api", `Spotify error ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}
