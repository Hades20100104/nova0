import { useEffect, useRef, useState, useCallback } from "react";
import { getSpotifyTokensForUser, setSpotifyTokensForUser, clearSpotifyTokensForUser, generateCodeChallenge, generateCodeVerifier, setSpotifyPkce, setSpotifyUserHint, getSpotifyUserHint } from "@/lib/spotify-storage";
import { clearStoredSpotifyConnection, getStoredSpotifyConnection, refreshSpotifyToken, SPOTIFY_CLIENT_ID_PUBLIC } from "@/server/spotify.functions";
import { useServerFn } from "@tanstack/react-start";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
];

function toResolvedTrack(track: any): SpotifyResolvedTrack | null {
  const title = track?.name;
  const uri = track?.uri;
  const id = track?.id;
  const artist = track?.artists?.map((a: any) => a.name).filter(Boolean).join(", ") ?? "";
  if (!title || !uri || !id) return null;
  return {
    query: artist ? `${artist} - ${title}` : title,
    spotify_uri: uri,
    spotify_track_id: id,
    spotify_artist: artist,
    spotify_album: track?.album?.name ?? "",
    cover_url: track?.album?.images?.[0]?.url ?? null,
  };
}

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

export interface SpotifyResolvedTrack {
  query: string;
  spotify_uri: string;
  spotify_track_id: string;
  spotify_artist: string;
  spotify_album: string;
  cover_url: string | null;
}

export interface SpotifyState {
  ready: boolean;
  connected: boolean;
  deviceId: string | null;
  current: SpotifyTrack | null;
  paused: boolean;
  positionMs: number;
  /** BPM del track actual (de /audio-features). Null si no se conoce todavía. */
  tempo: number | null;
  /** Energía 0-1 (de /audio-features). Modula amplitud de las ondas. */
  energy: number | null;
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
  const getStoredConnectionFn = useServerFn(getStoredSpotifyConnection);
  const clearStoredConnectionFn = useServerFn(clearStoredSpotifyConnection);
  const playerRef = useRef<any>(null);
  const [tokenVersion, setTokenVersion] = useState(0);
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
    tempo: null,
    energy: null,
  });

  useEffect(() => {
    if (!enabled || !appUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = await getStoredConnectionFn({});
        if (cancelled) return;
        if (stored.tokens) {
          setSpotifyTokensForUser(appUserId, stored.tokens);
          setSpotifyUserHint(appUserId);
          setTokenVersion((version) => version + 1);
        }
      } catch (e) {
        console.warn("getStoredSpotifyConnection", e);
      }
    })();
    return () => { cancelled = true; };
  }, [appUserId, enabled, getStoredConnectionFn]);

  /** Devuelve un access token vigente (refresca si expira). */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const t = getSpotifyTokensForUser(appUserId);
    if (!t) return null;
    const tokenOwner = getSpotifyUserHint();
    if (appUserId && tokenOwner && tokenOwner !== appUserId) {
      clearSpotifyTokensForUser(appUserId);
      setSpotifyUserHint(null);
      return null;
    }
    if (Date.now() < t.expires_at - 60_000) return t.access_token;
    if (!t.refresh_token) {
      clearSpotifyTokensForUser(appUserId);
      return null;
    }
    const res = await refreshFn({ data: { refreshToken: t.refresh_token } });
    if (res.error || !res.access_token) {
      clearSpotifyTokensForUser(appUserId);
      return null;
    }
    setSpotifyTokensForUser(appUserId, {
      access_token: res.access_token,
      refresh_token: res.refresh_token ?? t.refresh_token,
      expires_at: Date.now() + (res.expires_in ?? 3600) * 1000,
      spotify_user_id: t.spotify_user_id ?? null,
    });
    return res.access_token;
  }, [appUserId, refreshFn]);

  // Cargar SDK + crear player
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const tokenOwner = getSpotifyUserHint();
    if (appUserId && tokenOwner && tokenOwner !== appUserId) {
      clearSpotifyTokensForUser(appUserId);
      setSpotifyUserHint(appUserId);
      setState({ ready: false, connected: false, deviceId: null, current: null, paused: true, positionMs: 0, tempo: null, energy: null });
      return;
    }
    if (appUserId && !tokenOwner && getSpotifyTokensForUser(appUserId)) {
      setSpotifyUserHint(appUserId);
    }
    const tokens = getSpotifyTokensForUser(appUserId);
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
        clearSpotifyTokensForUser(appUserId);
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
  }, [appUserId, enabled, getAccessToken, tokenVersion]);

  /** Lanza el flujo OAuth con PKCE. */
  const startLogin = useCallback(async () => {
    clearSpotifyTokensForUser(appUserId);
    if (appUserId) setSpotifyUserHint(appUserId);
    setTokenVersion((version) => version + 1);
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
    clearSpotifyTokensForUser(appUserId);
    setSpotifyUserHint(null);
    if (appUserId) void clearStoredConnectionFn({});
    try { playerRef.current?.disconnect(); } catch { /* noop */ }
    playerRef.current = null;
    setState({ ready: false, connected: false, deviceId: null, current: null, paused: true, positionMs: 0, tempo: null, energy: null });
    setTokenVersion((version) => version + 1);
  }, [appUserId, clearStoredConnectionFn]);

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
      if (res.status === 401) clearSpotifyTokensForUser(appUserId);
      throw new Error(message);
    }
    return res;
  }, [getAccessToken]);

  // Cuando cambia el track, obtenemos tempo + energía para sincronizar las ondas.
  const currentTrackId = state.current?.id ?? null;
  useEffect(() => {
    if (!currentTrackId) {
      setState((s) => ({ ...s, tempo: null, energy: null }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/audio-features/${currentTrackId}`);
        const f = await res.json();
        if (cancelled) return;
        setState((s) => ({
          ...s,
          tempo: typeof f?.tempo === "number" ? f.tempo : null,
          energy: typeof f?.energy === "number" ? f.energy : null,
        }));
      } catch (e) {
        console.warn("audio-features", e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentTrackId, api]);

  /**
   * Asegura que nuestro Web Playback device es el dispositivo activo del usuario
   * antes de mandar comandos /me/player/play. Esto soluciona el error
   * "No active device found" / "Restriction violated" que aparece cuando el
   * usuario tiene Spotify abierto en otro dispositivo (TV, móvil) o nunca
   * "transfirió" la reproducción al navegador.
   */
  /**
   * Espera hasta `timeout` ms a que el SDK reporte un deviceId. Resuelve con el
   * deviceId actual o null si pasa el timeout. Evita el error inmediato
   * "Reproductor aún no listo" cuando el usuario pulsa play justo después de
   * conectar Spotify y el SDK aún no terminó de inicializar.
   */
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const waitForDevice = useCallback(async (timeout = 8000): Promise<string | null> => {
    if (stateRef.current.deviceId) return stateRef.current.deviceId;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 200));
      if (stateRef.current.deviceId) return stateRef.current.deviceId;
    }
    return stateRef.current.deviceId ?? null;
  }, []);

  const ensureActiveDevice = useCallback(async () => {
    const deviceId = await waitForDevice();
    if (!deviceId) throw new Error("Reproductor aún no listo. Espera unos segundos a que Spotify cargue o recarga la página.");
    try {
      const res = await api(`/me/player/devices`);
      const json = await res.json();
      const devices: any[] = json.devices ?? [];
      const ours = devices.find((d) => d.id === deviceId);
      if (!ours || !ours.is_active) {
        await api(`/me/player`, {
          method: "PUT",
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        });
        await new Promise((r) => setTimeout(r, 350));
      }
    } catch (e) {
      console.warn("ensureActiveDevice", e);
    }
    return deviceId;
  }, [api, waitForDevice]);

  const playOnDevice = useCallback(async (body: any) => {
    const deviceId = await ensureActiveDevice();
    try {
      await api(`/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/premium/i.test(msg)) {
        throw new Error("La reproducción dentro de la app requiere Spotify Premium.");
      }
      try {
        await api(`/me/player`, {
          method: "PUT",
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        });
        await new Promise((r) => setTimeout(r, 500));
        await api(`/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } catch (e2) {
        const m = e2 instanceof Error ? e2.message : String(e2);
        throw new Error(`Spotify no aceptó la reproducción: ${m}. Asegúrate de tener Spotify Premium y de no estar en modo privado en otra app.`);
      }
    }
  }, [api, ensureActiveDevice]);

  /**
   * Busca y reproduce. Soporta:
   *  - "playlist <nombre>"  → reproduce playlist completa
   *  - "album <nombre>"     → reproduce álbum completo
   *  - "<canción>"          → reproduce la canción + cola con tracks del mismo artista
   */
  const playSearch = useCallback(async (query: string) => {
    // ensureActiveDevice (dentro de playOnDevice) espera al SDK; no fallamos aquí.
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
      await playOnDevice({ context_uri: pl.uri });
      return `playlist ${pl.name}`;
    }

    // ÁLBUM
    if (isAlbum) {
      const res = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=album&limit=1`);
      const json = await res.json();
      const al = json.albums?.items?.[0];
      if (!al) throw new Error("No encontré ese álbum.");
      await playOnDevice({ context_uri: al.uri });
      return `álbum ${al.name}`;
    }

    if (isArtist) {
      const artistRes = await api(`/search?q=${encodeURIComponent(cleanQuery)}&type=artist&limit=1`);
      const artistJson = await artistRes.json();
      const artist = artistJson.artists?.items?.[0];
      if (!artist) throw new Error("No encontré ese artista.");

      let uris: string[] = [];
      for (const market of ["from_token", "US", "ES", "MX"] as const) {
        const topRes = await api(`/artists/${artist.id}/top-tracks?market=${market}`);
        const topJson = await topRes.json();
        uris = (topJson.tracks ?? []).map((t: any) => t.uri).filter(Boolean).slice(0, 10);
        if (uris.length > 0) break;
      }
      if (uris.length === 0) throw new Error("No encontré canciones reproducibles de ese artista.");

      await playOnDevice({ uris });
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

    await playOnDevice({ uris });
    return track.name as string;
  }, [api, playOnDevice]);

  /**
   * Reproduce la cola personal (queueRef) desde el índice actual.
   * Cada item puede ser una URI directa (`spotify:track:...`) o un texto
   * libre que buscamos en /search. Avanzamos al siguiente cuando termina.
   */
  const playNextRef = useRef<(() => Promise<void>) | null>(null);
  const playNextFromQueue = useCallback(async () => {
    const q = queueRef.current;
    if (!q) return;
    const item = q.items[q.index];
    if (!item) return;
    try {
      let uri = item.startsWith("spotify:track:") ? item : null;
      if (!uri) {
        const res = await api(`/search?q=${encodeURIComponent(item)}&type=track&limit=1`);
        const json = await res.json();
        const track = json.tracks?.items?.[0];
        if (!track) return;
        uri = track.uri;
      }
      await playOnDevice({ uris: [uri] });
    } catch (e) {
      console.error("playNextFromQueue", e);
    }
  }, [api, playOnDevice]);
  playNextRef.current = playNextFromQueue;

  /**
   * Reproduce una playlist personal (lista de queries o URIs `spotify:track:...`).
   */
  const playLocalPlaylist = useCallback(async (queries: string[]) => {
    if (queries.length === 0) throw new Error("Esta playlist está vacía.");
    queueRef.current = { items: queries, index: 0 };
    await playNextFromQueue();
  }, [playNextFromQueue]);


  const generateArtistPlaylistQueries = useCallback(async (artists: string[]) => {
    const cleanArtists = artists.map((artist) => artist.trim()).filter(Boolean);
    if (cleanArtists.length === 0) return { queries: [] as string[], tracks: [] as SpotifyResolvedTrack[], log: [] as Array<{ artist: string; resolvedAs: string | null; tracks: number; reason?: string }> };
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Conecta Spotify primero (Menú → Conectar Spotify) para generar playlists desde artistas.");
    }

    const out: SpotifyResolvedTrack[] = [];
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

        let tracks: SpotifyResolvedTrack[] = [];
        for (const market of ["from_token", "US", "ES", "MX"] as const) {
          const topRes = await api(`/artists/${artist.id}/top-tracks?market=${market}`);
          const topJson = await topRes.json();
          tracks = (topJson.tracks ?? [])
            .filter((track: any) => track?.artists?.some((a: any) => a.id === artist.id))
            .map(toResolvedTrack)
            .filter(Boolean)
            .slice(0, 6);
          if (tracks.length > 0) break;
        }

        if (tracks.length === 0) {
          const fallbackRes = await api(`/search?q=${encodeURIComponent(`artist:"${artist.name}"`)}&type=track&limit=10`);
          const fallbackJson = await fallbackRes.json();
          tracks = (fallbackJson.tracks?.items ?? [])
            .filter((track: any) => track?.artists?.some((a: any) => a.id === artist.id))
            .map(toResolvedTrack)
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

    const unique = Array.from(new Map(out.map((track) => [track.spotify_track_id, track])).values());
    return { queries: unique.map((track) => track.query), tracks: unique, log };
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

  const rawTokens = getSpotifyTokensForUser(appUserId);
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
