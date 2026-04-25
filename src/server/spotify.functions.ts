import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

interface ExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

interface RefreshInput {
  refreshToken: string;
}

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface StoredSpotifyConnection {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  spotify_user_id: string | null;
  spotify_display_name: string | null;
  scopes: string[] | null;
}

const TOKEN_URL = "https://accounts.spotify.com/api/token";

async function readSpotifyTokenResponse(res: Response): Promise<SpotifyTokenResponse & { rawText?: string }> {
  const rawText = await res.text();
  try {
    return { ...(JSON.parse(rawText) as SpotifyTokenResponse), rawText };
  } catch {
    return { error: rawText || "Respuesta inválida de Spotify.", rawText };
  }
}

async function fetchSpotifyProfile(accessToken: string): Promise<{ id: string | null; displayName: string | null }> {
  try {
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) return { id: null, displayName: null };
    const me = (await meRes.json()) as { id?: string; display_name?: string };
    return { id: me.id ?? null, displayName: me.display_name ?? me.id ?? null };
  } catch (e) {
    console.warn("Spotify /me lookup failed:", e);
    return { id: null, displayName: null };
  }
}

async function refreshWithSpotify(refreshToken: string): Promise<SpotifyTokenResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: "Spotify no está configurado en el servidor." };
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString(),
  });
  const json = await readSpotifyTokenResponse(res);
  if (!res.ok || !json.access_token) {
    console.error("Spotify refresh error:", res.status, json.rawText ?? json.error);
  }
  return json;
}

/**
 * Intercambia el `code` de Spotify por un access/refresh token usando PKCE.
 * El client_secret se lee del entorno (server-only).
 */
export const exchangeSpotifyCode = createServerFn({ method: "POST" })
  .inputValidator((input: ExchangeInput) => {
    if (!input?.code) throw new Error("code requerido");
    if (!input?.codeVerifier) throw new Error("codeVerifier requerido");
    if (!input?.redirectUri) throw new Error("redirectUri requerido");
    return input;
  })
  .handler(async ({ data }) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { error: "Spotify no está configurado en el servidor.", access_token: null, refresh_token: null, expires_in: 0 };
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: data.code,
      redirect_uri: data.redirectUri,
      client_id: clientId,
      code_verifier: data.codeVerifier,
    });

    const basic = btoa(`${clientId}:${clientSecret}`);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: body.toString(),
    });

    const json = await readSpotifyTokenResponse(res);
    if (!res.ok || !json.access_token) {
      console.error("Spotify exchange error:", res.status, json.rawText ?? json.error);
      return {
        error: json.error_description || json.error || "No se pudo intercambiar el código.",
        access_token: null,
        refresh_token: null,
        expires_in: 0,
        spotify_user_id: null as string | null,
      };
    }

    // Identificar al usuario real de Spotify dueño de este token.
    let spotifyUserId: string | null = null;
    try {
      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${json.access_token}` },
      });
      if (meRes.ok) {
        const me = (await meRes.json()) as { id?: string };
        spotifyUserId = me.id ?? null;
      }
    } catch (e) {
      console.warn("Spotify /me lookup failed:", e);
    }

    return {
      error: null as string | null,
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expires_in: json.expires_in ?? 3600,
      spotify_user_id: spotifyUserId,
    };
  });

/**
 * Refresca el access_token usando el refresh_token guardado.
 */
export const refreshSpotifyToken = createServerFn({ method: "POST" })
  .inputValidator((input: RefreshInput) => {
    if (!input?.refreshToken) throw new Error("refreshToken requerido");
    return input;
  })
  .handler(async ({ data }) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { error: "Spotify no está configurado en el servidor.", access_token: null, refresh_token: null, expires_in: 0 };
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: data.refreshToken,
      client_id: clientId,
    });
    const basic = btoa(`${clientId}:${clientSecret}`);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: body.toString(),
    });

    const json = await readSpotifyTokenResponse(res);
    if (!res.ok || !json.access_token) {
      console.error("Spotify refresh error:", res.status, json.rawText ?? json.error);
      return {
        error: json.error_description || json.error || "No se pudo refrescar el token.",
        access_token: null,
        refresh_token: null,
        expires_in: 0,
      };
    }

    return {
      error: null as string | null,
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? data.refreshToken,
      expires_in: json.expires_in ?? 3600,
    };
  });

export const SPOTIFY_CLIENT_ID_PUBLIC = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.SPOTIFY_CLIENT_ID ?? null };
});
