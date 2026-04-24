import { useEffect, useRef, useState, useCallback } from "react";
import { getSpotifyTokens, setSpotifyTokens, clearSpotifyTokens, generateCodeChallenge, generateCodeVerifier, setSpotifyPkce, setSpotifyUserHint, getSpotifyUserHint } from "@/lib/spotify-storage";
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

export function useSpotify(enabled: boolean, appUserId?: string | null) {
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
    const tokenOwner = getSpotifyUserHint();
    if (appUserId && tokenOwner && tokenOwner !== appUserId) {
      clearSpotifyTokens();
      setSpotifyUserHint(null);
      return null;
    }
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
  }, [appUserId, refreshFn]);

  // Cargar SDK + crear player
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const tokenOwner = getSpotifyUserHint();
    if (appUserId && tokenOwner && tokenOwner !== appUserId) {
      clearSpotifyTokens();
      setSpotifyUserHint(appUserId);
      setState({ ready: false, connected: false, deviceId: null, current: null, paused: true, positionMs: 0 });
      return;
    }
    if (appUserId && !tokenOwner && getSpotifyTokens()) {
      setSpotifyUserHint(appUserId);
    }
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
        // Detectar fin de track para autoplay de cola personal
        // Spotify SDK marca: paused=true, position=0, y duration > 0 cuando termina la última pista
        const finished =
          st.paused === true &&
          st.position === 0 &&
          (st.duration ?? 0) > 0 &&
          (st.track_window?.next_tracks?.length ?? 0) === 0;
        if (finished && queueRef.current) {
          const q = queueRef.current;
          if (q.index + 1 < q.items.length) {
            q.index += 1;
            // Disparar siguiente sin bloquear el listener
            void playNextRef.current?.();
          } else {
            queueRef.current = null;
          }
        }
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
  }, [appUserId, enabled, getAccessToken]);

  /** Lanza el flujo OAuth con PKCE. */
  const startLogin = useCallback(async () => {
    clearSpotifyTokens();
    if (appUserId) setSpotifyUserHint(appUserId);
    const { clientId } = await getClientIdFn();
    if (!clientId) {
      throw new Error("Spotify no está configurado en el servidor (falta SPOTIFY_CLIENT_ID).");
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
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
    setSpotifyPkce(verifier, redirectUri);
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
  }, [appUserId, getClientIdFn]);

  const logout = useCallback(() => {
    clearSpotifyTokens();
    setSpotifyUserHint(null);
    try { playerRef.current?.disconnect(); } catch { /* noop */ }
    playerRef.current = null;
    setState({ ready: false, connected: false, deviceId: null, current: null, paused: true, positionMs: 0 });
  }, []);

  /** Llama API de Spotify con token vigente. */
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No hay token de Spotify.");
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok && res.status !== 204) {
      const raw = await res.text().catch(() => "");
      let message = `Spotify devolvió ${res.status}.`;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        message = parsed?.error?.message ?? parsed?.error_description ?? parsed?.error ?? message;
      } catch {
        if (raw) message = raw;
      }
      if (res.status === 401) clearSpotifyTokens();
      throw new Error(message);
    }
    return res;
  }, [getAccessToken]);

  /**
   * Busca y reproduce. Soporta:
   *  - "playlist <nombre>"  → reproduce playlist completa
   *  - "album <nombre>"     → reproduce álbum completo
   *  - "<canción>"          → reproduce la canción + cola con tracks del mismo artista
   */
  const playSearch = useCallback(async (query: string) => {
    if (!state.deviceId) throw new Error("Reproductor aún no listo.");
    // Cualquier reproducción manual cancela la cola personal en curso
    queueRef.current = null;

    const lower = query.toLowerCase().trim();
    const isPlaylist = /^(playlist|lista)\s+/.test(lower);
    const isAlbum = /^(album|álbum|disco)\s+/.test(lower);
    const isArtist = /^(artista|artist)\s+/.test(lower);
    const cleanQuery = query.replace(/^(playlist|lista|album|álbum|disco|artista|artist)\s+/i, "").trim();

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

    if (isArtist) {
      const artistRes = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=artist&limit=1`);
      const artistJson = await artistRes.json();
      const artist = artistJson.artists?.items?.[0];
      if (!artist) throw new Error("No encontré ese artista.");

      const topRes = await api(`/artists/${artist.id}/top-tracks?market=from_token`);
      const topJson = await topRes.json();
      const uris: string[] = (topJson.tracks ?? []).map((t: any) => t.uri).filter(Boolean).slice(0, 10);
      if (uris.length === 0) throw new Error("No encontré canciones reproducibles de ese artista.");

      await api(`/me/player/play?device_id=${state.deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ uris }),
      });
      return `artista ${artist.name}`;
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

  /**
   * Reproduce la cola personal (queueRef) desde el índice actual.
   * Cada `query` se busca como track y se reproduce; al terminar, el listener
   * de `player_state_changed` avanza al siguiente.
   */
  const playNextRef = useRef<(() => Promise<void>) | null>(null);
  const playNextFromQueue = useCallback(async () => {
    const q = queueRef.current;
    if (!q || !state.deviceId) return;
    const query = q.items[q.index];
    if (!query) return;
    try {
      const res = await api(`/search?q=${encodeURIComponent(query)}&type=track&limit=1`);
      const json = await res.json();
      const track = json.tracks?.items?.[0];
      if (!track) return;
      await api(`/me/player/play?device_id=${state.deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [track.uri] }),
      });
    } catch (e) {
      console.error("playNextFromQueue", e);
    }
  }, [api, state.deviceId]);
  playNextRef.current = playNextFromQueue;

  /**
   * Reproduce una playlist personal (lista de queries).
   * Inicia con el primer item y deja que el autoplay continúe.
   */
  const playLocalPlaylist = useCallback(async (queries: string[]) => {
    if (!state.deviceId) throw new Error("Reproductor aún no listo.");
    if (queries.length === 0) throw new Error("Esta playlist está vacía.");
    queueRef.current = { items: queries, index: 0 };
    await playNextFromQueue();
  }, [state.deviceId, playNextFromQueue]);

  const generateArtistPlaylistQueries = useCallback(async (artists: string[]) => {
    const cleanArtists = artists.map((artist) => artist.trim()).filter(Boolean);
    if (cleanArtists.length === 0) return { queries: [] as string[], log: [] as Array<{ artist: string; resolvedAs: string | null; tracks: number; reason?: string }> };
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Conecta Spotify primero (Menú → Conectar Spotify) para generar playlists desde artistas.");
    }

    const out: string[] = [];
    const log: Array<{ artist: string; resolvedAs: string | null; tracks: number; reason?: string }> = [];

    for (const artistName of cleanArtists) {
      const entry: { artist: string; resolvedAs: string | null; tracks: number; reason?: string } = { artist: artistName, resolvedAs: null, tracks: 0 };
      try {
        const artistRes = await api(`/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`);
        const artistJson = await artistRes.json();
        const artist = artistJson.artists?.items?.[0];
        if (!artist?.id) {
          entry.reason = "Spotify no devolvió ningún artista con ese nombre";
          log.push(entry);
          continue;
        }
        entry.resolvedAs = artist.name;

        let tracks: string[] = [];
        for (const market of ["from_token", "US", "ES", "MX"] as const) {
          const topRes = await api(`/artists/${artist.id}/top-tracks?market=${market}`);
          const topJson = await topRes.json();
          tracks = (topJson.tracks ?? [])
            .map((track: any) => {
              const title = track?.name;
              const primaryArtist = track?.artists?.[0]?.name ?? artist.name;
              return title ? `${primaryArtist} - ${title}` : null;
            })
            .filter(Boolean)
            .slice(0, 6);
          if (tracks.length > 0) break;
        }

        if (tracks.length === 0) {
          const fallbackRes = await api(`/search?q=${encodeURIComponent(`artist:"${artist.name}"`)}&type=track&limit=10`);
          const fallbackJson = await fallbackRes.json();
          tracks = (fallbackJson.tracks?.items ?? [])
            .map((track: any) => {
              const title = track?.name;
              const primaryArtist = track?.artists?.[0]?.name ?? artist.name;
              return title ? `${primaryArtist} - ${title}` : null;
            })
            .filter(Boolean)
            .slice(0, 6);
        }

        if (tracks.length === 0) {
          entry.reason = "El artista existe pero no tiene tracks reproducibles en tu mercado";
        }

        entry.tracks = tracks.length;
        out.push(...tracks);
      } catch (e) {
        entry.reason = e instanceof Error ? e.message : "Error desconocido";
      }
      log.push(entry);
    }

    if (out.length === 0 && cleanArtists.length === 1) {
      return { queries: [cleanArtists[0], `artista ${cleanArtists[0]}`], log };
    }

    return { queries: Array.from(new Set(out)), log };
  }, [api, getAccessToken]);

  /** Busca artistas para autocompletado (top 5). */
  const searchArtists = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [] as Array<{ id: string; name: string; image: string | null; followers: number }>;
    const token = await getAccessToken();
    if (!token) return [];
    try {
      const res = await api(`/search?q=${encodeURIComponent(trimmed)}&type=artist&limit=5`);
      const json = await res.json();
      return (json.artists?.items ?? []).map((a: any) => ({
        id: a.id as string,
        name: a.name as string,
        image: a.images?.[0]?.url ?? null,
        followers: a.followers?.total ?? 0,
      }));
    } catch (e) {
      console.warn("searchArtists", e);
      return [];
    }
  }, [api, getAccessToken]);

  /** Lista los dispositivos Spotify Connect disponibles del usuario. */
  const listDevices = useCallback(async () => {
    const res = await api(`/me/player/devices`);
    const json = await res.json();
    return (json.devices ?? []) as Array<{ id: string; name: string; type: string; is_active: boolean; volume_percent: number }>;
  }, [api]);

  /** Transfiere la reproducción al dispositivo indicado (Spotify Connect). */
  const transferPlayback = useCallback(async (deviceId: string, play = true) => {
    await api(`/me/player`, {
      method: "PUT",
      body: JSON.stringify({ device_ids: [deviceId], play }),
    });
  }, [api]);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);
  const next = useCallback(async () => {
    // Si hay cola personal, avanzar dentro de ella
    if (queueRef.current && queueRef.current.index + 1 < queueRef.current.items.length) {
      queueRef.current.index += 1;
      await playNextFromQueue();
      return;
    }
    await playerRef.current?.nextTrack();
  }, [playNextFromQueue]);
  const prev = useCallback(async () => {
    if (queueRef.current && queueRef.current.index > 0) {
      queueRef.current.index -= 1;
      await playNextFromQueue();
      return;
    }
    await playerRef.current?.previousTrack();
  }, [playNextFromQueue]);
  const setVolume = useCallback(async (v: number) => { await playerRef.current?.setVolume(v); }, []);

  const rawTokens = getSpotifyTokens();
  const isAuthenticated = !!rawTokens && (!appUserId || !getSpotifyUserHint() || getSpotifyUserHint() === appUserId);

  return {
    state,
    isAuthenticated,
    startLogin,
    logout,
    playSearch,
    playLocalPlaylist,
    generateArtistPlaylistQueries,
    searchArtists,
    listDevices,
    transferPlayback,
    togglePlay,
    next,
    prev,
    setVolume,
  };
}
