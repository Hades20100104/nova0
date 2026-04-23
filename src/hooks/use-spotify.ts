import { useEffect, useRef, useState, useCallback } from "react";
import { getSpotifyTokens, setSpotifyTokens, clearSpotifyTokens, generateCodeChallenge, generateCodeVerifier } from "@/lib/spotify-storage";
import { refreshSpotifyToken, SPOTIFY_CLIENT_ID_PUBLIC } from "@/server/spotify.functions";
import { useServerFn } from "@tanstack/react-start";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
];

// El client_id se obtiene del servidor (que lo lee de SPOTIFY_CLIENT_ID secret)
// para evitar tener que duplicarlo como variable VITE_ pública.

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string | null;
  uri: string;
  durationMs: number;
}

export interface SpotifyState {
  ready: boolean;
  connected: boolean;
  deviceId: string | null;
  current: SpotifyTrack | null;
  paused: boolean;
  positionMs: number;
}

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export function useSpotify(enabled: boolean) {
  const refreshFn = useServerFn(refreshSpotifyToken);
  const getClientIdFn = useServerFn(SPOTIFY_CLIENT_ID_PUBLIC);
  const playerRef = useRef<any>(null);
  // Cola personal: lista de queries (canción/artista) que se reproducen en orden
  // y avanzan automáticamente cuando termina cada track.
  const queueRef = useRef<{ items: string[]; index: number } | null>(null);
  const [state, setState] = useState<SpotifyState>({
    ready: false,
    connected: false,
    deviceId: null,
    current: null,
    paused: true,
    positionMs: 0,
  });

  /** Devuelve un access token vigente (refresca si expira). */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const t = getSpotifyTokens();
    if (!t) return null;
    if (Date.now() < t.expires_at - 60_000) return t.access_token;
    if (!t.refresh_token) {
      clearSpotifyTokens();
      return null;
    }
    const res = await refreshFn({ data: { refreshToken: t.refresh_token } });
    if (res.error || !res.access_token) {
      clearSpotifyTokens();
      return null;
    }
    setSpotifyTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token ?? t.refresh_token,
      expires_at: Date.now() + (res.expires_in ?? 3600) * 1000,
    });
    return res.access_token;
  }, [refreshFn]);

  // Cargar SDK + crear player
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const tokens = getSpotifyTokens();
    if (!tokens) return;

    let mounted = true;

    const init = () => {
      if (!window.Spotify || playerRef.current) return;
      const player = new window.Spotify.Player({
        name: "NEVIRA & NOVA",
        getOAuthToken: async (cb: (token: string) => void) => {
          const token = await getAccessToken();
          if (token) cb(token);
        },
        volume: 0.6,
      });
      playerRef.current = player;

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        if (!mounted) return;
        setState((s) => ({ ...s, ready: true, connected: true, deviceId: device_id }));
      });
      player.addListener("not_ready", () => {
        if (!mounted) return;
        setState((s) => ({ ...s, ready: false }));
      });
      player.addListener("player_state_changed", (st: any) => {
        if (!mounted || !st) return;
        const t = st.track_window?.current_track;
        setState((prev) => ({
          ...prev,
          paused: st.paused,
          positionMs: st.position,
          current: t ? {
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") ?? "",
            album: t.album?.name ?? "",
            cover: t.album?.images?.[0]?.url ?? null,
            uri: t.uri,
            durationMs: t.duration_ms,
          } : prev.current,
        }));
      });
      player.addListener("authentication_error", () => {
        clearSpotifyTokens();
        setState((s) => ({ ...s, connected: false, ready: false }));
      });
      player.connect();
    };

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      mounted = false;
      try { playerRef.current?.disconnect(); } catch { /* noop */ }
      playerRef.current = null;
    };
  }, [enabled, getAccessToken]);

  /** Lanza el flujo OAuth con PKCE. */
  const startLogin = useCallback(async () => {
    const { clientId } = await getClientIdFn();
    if (!clientId) {
      throw new Error("Spotify no está configurado en el servidor (falta SPOTIFY_CLIENT_ID).");
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("spotify_pkce_verifier", verifier);
    // Si estamos dentro del iframe del preview de Lovable, usamos el origin "real"
    // (window.top) para que Spotify pueda redirigir correctamente y no rechazarnos
    // por X-Frame-Options.
    let origin = window.location.origin;
    try {
      if (window.top && window.top !== window.self) {
        origin = window.top.location.origin;
      }
    } catch {
      // Cross-origin iframe (publicado dentro de otro sitio): mantenemos origin propio.
    }
    const redirectUri = `${origin}/spotify/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    // Forzar navegación de la ventana superior para escapar del iframe del preview.
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = authUrl;
        return;
      }
    } catch {
      // Si no podemos acceder a top (cross-origin), abrimos pestaña nueva.
      window.open(authUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = authUrl;
  }, [getClientIdFn]);

  const logout = useCallback(() => {
    clearSpotifyTokens();
    try { playerRef.current?.disconnect(); } catch { /* noop */ }
    playerRef.current = null;
    setState({ ready: false, connected: false, deviceId: null, current: null, paused: true, positionMs: 0 });
  }, []);

  /** Llama API de Spotify con token vigente. */
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No hay token de Spotify.");
    return fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }, [getAccessToken]);

  /**
   * Busca y reproduce. Soporta:
   *  - "playlist <nombre>"  → reproduce playlist completa
   *  - "album <nombre>"     → reproduce álbum completo
   *  - "<canción>"          → reproduce la canción + cola con tracks del mismo artista
   */
  const playSearch = useCallback(async (query: string) => {
    if (!state.deviceId) throw new Error("Reproductor aún no listo.");

    const lower = query.toLowerCase().trim();
    const isPlaylist = /^(playlist|lista)\s+/.test(lower);
    const isAlbum = /^(album|álbum|disco)\s+/.test(lower);
    const cleanQuery = query.replace(/^(playlist|lista|album|álbum|disco)\s+/i, "").trim();

    // PLAYLIST
    if (isPlaylist) {
      const res = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=playlist&limit=1`);
      const json = await res.json();
      const pl = json.playlists?.items?.[0];
      if (!pl) throw new Error("No encontré esa playlist.");
      await api(`/me/player/play?device_id=${state.deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ context_uri: pl.uri }),
      });
      return `playlist ${pl.name}`;
    }

    // ÁLBUM
    if (isAlbum) {
      const res = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=album&limit=1`);
      const json = await res.json();
      const al = json.albums?.items?.[0];
      if (!al) throw new Error("No encontré ese álbum.");
      await api(`/me/player/play?device_id=${state.deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ context_uri: al.uri }),
      });
      return `álbum ${al.name}`;
    }

    // CANCIÓN + cola del artista (para que siga sonando música después)
    const res = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=track&limit=1`);
    const json = await res.json();
    const track = json.tracks?.items?.[0];
    if (!track) throw new Error("No encontré esa canción.");

    const artistId: string | undefined = track.artists?.[0]?.id;
    let uris: string[] = [track.uri];

    if (artistId) {
      try {
        const topRes = await api(`/artists/${artistId}/top-tracks?market=from_token`);
        const topJson = await topRes.json();
        const topUris: string[] = (topJson.tracks ?? [])
          .map((t: any) => t.uri)
          .filter((u: string) => u && u !== track.uri);
        uris = [track.uri, ...topUris.slice(0, 9)];
      } catch {
        /* si falla, reproducimos solo la canción */
      }
    }

    await api(`/me/player/play?device_id=${state.deviceId}`, {
      method: "PUT",
      body: JSON.stringify({ uris }),
    });
    return track.name as string;
  }, [api, state.deviceId]);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);
  const next = useCallback(async () => { await playerRef.current?.nextTrack(); }, []);
  const prev = useCallback(async () => { await playerRef.current?.previousTrack(); }, []);
  const setVolume = useCallback(async (v: number) => { await playerRef.current?.setVolume(v); }, []);

  const isAuthenticated = !!getSpotifyTokens();

  return {
    state,
    isAuthenticated,
    startLogin,
    logout,
    playSearch,
    togglePlay,
    next,
    prev,
    setVolume,
  };
}
