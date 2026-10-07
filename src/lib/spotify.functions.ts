import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHmac } from "crypto";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "playlist-read-private",
  "playlist-modify-private",
  "user-library-read",
].join(" ");

function signState(userId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback";
  const nonce = Date.now().toString(36);
  const payload = `${userId}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${sig}`;
}

export const getSpotifyAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ context, data }) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) throw new Error("Spotify no configurado");
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI ?? `${data.origin}/api/spotify/callback`;
    const state = signState(context.userId);
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("show_dialog", "true");
    return { url: url.toString(), redirectUri };
  });

export const getSpotifyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("spotify_connections")
      .select("spotify_display_name, spotify_user_id, expires_at, scopes")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connected: !!data, connection: data ?? null };
  });

export const disconnectSpotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("spotify_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
