import { useEffect, useRef, useState, useCallback } from "react";
import { getSpotifyTokens, setSpotifyTokens, clearSpotifyTokens, generateCodeChallenge, generateCodeVerifier } from "@/lib/spotify-storage";
import { refreshSpotifyToken } from "@/server/spotify.functions";
import { useServerFn } from "@tanstack/react-start";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
];

// Client ID público (ofuscado: viene también en una server fn). Como Spotify
// requiere que el client_id viaje en la URL de autorización, lo dejamos en el
// frontend leyéndolo de un input env público sería ideal; aquí lo tomamos de
// una variable Vite que el usuario expone.
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;

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
  const playerRef = useRef<any>(null);
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
    if (!CLIENT_ID) {
      throw new Error("Falta VITE_SPOTIFY_CLIENT_ID en variables de entorno.");
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("spotify_pkce_verifier", verifier);
    const redirectUri = `${window.location.origin}/spotify/callback`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }, []);

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

  /** Busca canción/playlist y reproduce la primera. */
  const playSearch = useCallback(async (query: string) => {
    if (!state.deviceId) throw new Error("Reproductor aún no listo.");
    const res = await api(`/search?q=${encodeURIComponent(query)}&type=track&limit=1`);
    const json = await res.json();
    const uri = json.tracks?.items?.[0]?.uri;
    if (!uri) throw new Error("No encontré esa canción.");
    await api(`/me/player/play?device_id=${state.deviceId}`, {
      method: "PUT",
      body: JSON.stringify({ uris: [uri] }),
    });
    return json.tracks.items[0].name as string;
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
