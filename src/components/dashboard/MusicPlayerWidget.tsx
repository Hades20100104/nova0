import { Play, SkipBack, SkipForward, Shuffle, Pause, Repeat, Repeat1, Heart, Volume2, Search, ListMusic, Loader2, Music } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPlayerState,
  controlPlayer,
  searchTracks,
  listMyPlaylists,
  type PlayerState,
  type ControlInput,
  type TrackHit,
} from "@/lib/spotify-player.functions";
import { SpotifyConnectButton } from "./SpotifyConnectButton";


const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function MusicPlayerWidget() {
  const qc = useQueryClient();
  const stateFn = useServerFn(getPlayerState);
  const control = useServerFn(controlPlayer);
  const search = useServerFn(searchTracks);
  const playlistsFn = useServerFn(listMyPlaylists);

  const { data: st, isLoading } = useQuery({
    queryKey: ["spotify-player"],
    queryFn: () => stateFn(),
    refetchInterval: (q) => ((q.state.data as PlayerState | undefined)?.status === "ok" ? 5000 : 20000),
  });

  // Local progress interpolation between polls
  const [progress, setProgress] = useState(0);
  const base = useRef({ at: Date.now(), ms: 0 });
  useEffect(() => {
    base.current = { at: Date.now(), ms: st?.progressMs ?? 0 };
    setProgress(st?.progressMs ?? 0);
  }, [st?.progressMs, st?.trackId]);
  useEffect(() => {
    if (!st?.isPlaying) return;
    const id = setInterval(() => {
      setProgress(Math.min(st.durationMs ?? 0, base.current.ms + (Date.now() - base.current.at)));
    }, 500);
    return () => clearInterval(id);
  }, [st?.isPlaying, st?.durationMs]);

  const [volume, setVolume] = useState<number | null>(null);
  const [panel, setPanel] = useState<null | "search" | "playlists">(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TrackHit[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: pl } = useQuery({
    queryKey: ["spotify-playlists"],
    queryFn: () => playlistsFn(),
    enabled: panel === "playlists",
  });

  const act = async (input: ControlInput, optimistic?: Partial<PlayerState>) => {
    if (optimistic) qc.setQueryData<PlayerState>(["spotify-player"], (o) => (o ? { ...o, ...optimistic } : o));
    const res = await control({ data: input });
    if (!res.ok) toast.error(res.message ?? "No se pudo controlar Spotify");
    setTimeout(() => qc.invalidateQueries({ queryKey: ["spotify-player"] }), 600);
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    const r = await search({ data: { q } });
    setSearching(false);
    if (!r.ok) toast.error(r.message ?? "Error al buscar");
    setHits(r.hits);
  };

  const shell = (children: React.ReactNode) => (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-xl p-3"
      style={{ boxShadow: "0 0 30px color-mix(in oklab, var(--glow) 22%, transparent)" }}
    >
      {children}
    </div>
  );

  if (isLoading) return shell(<div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando con Spotify…</div>);

  if (!st || st.status === "not_connected") {
    return shell(
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Conecta tu cuenta de Spotify para controlar tu música desde aquí.</p>
        <SpotifyConnectButton />
      </div>,
    );
  }

  const ok = st.status === "ok" && !!st.title;
  const duration = st.durationMs ?? 0;
  const pct = duration ? (progress / duration) * 100 : 0;
  const nextRepeat = st.repeat === "off" ? "context" : st.repeat === "context" ? "track" : "off";

  return shell(
    <>
      {!ok && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2 text-[11px]">
          <Music className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>{st.message ?? "No hay nada sonando. Abre Spotify en algún dispositivo y elige una canción."}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-primary/40 bg-card">
          {st.cover ? (
            <img src={st.cover} alt={st.title ?? "Carátula"} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground font-mono">
                {st.isPlaying ? "Reproduciendo" : "En pausa"}{st.device ? ` · ${st.device}` : ""}
              </div>
              <div className="font-display text-sm truncate glow-text">{st.title ?? "Sin reproducción"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{st.artist ?? "—"}</div>
            </div>
            <button
              disabled={!st.trackId}
              onClick={() => st.trackId && act({ action: "like", trackId: st.trackId, liked: !st.liked }, { liked: !st.liked })}
              className="grid h-7 w-7 place-items-center rounded-full border border-primary/30 hover:border-primary transition disabled:opacity-40"
              aria-label={st.liked ? "Quitar de Me gusta" : "Me gusta"}
            >
              <Heart className={`h-3.5 w-3.5 ${st.liked ? "fill-accent text-accent" : "text-foreground/60"}`} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[9px] text-muted-foreground w-8 text-right">{fmt(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={progress}
              disabled={!ok}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={(e) => act({ action: "seek", positionMs: Number((e.target as HTMLInputElement).value) })}
              onTouchEnd={(e) => act({ action: "seek", positionMs: Number((e.target as HTMLInputElement).value) })}
              className="flex-1 h-1 accent-primary cursor-pointer"
              style={{ background: `linear-gradient(90deg, var(--primary) ${pct}%, transparent ${pct}%)` }}
              aria-label="Posición"
            />
            <span className="font-mono text-[9px] text-muted-foreground w-8">{fmt(duration)}</span>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-3 text-foreground/80">
            <button onClick={() => act({ action: "shuffle", state: !st.shuffle }, { shuffle: !st.shuffle })} className={st.shuffle ? "text-primary" : "hover:text-primary"} aria-label="Aleatorio">
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => act({ action: "previous" })} className="hover:text-primary" aria-label="Anterior"><SkipBack className="h-4 w-4" /></button>
            <button
              onClick={() => act({ action: st.isPlaying ? "pause" : "play" }, { isPlaying: !st.isPlaying })}
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-background hover:scale-105 transition"
              aria-label={st.isPlaying ? "Pausar" : "Reproducir"}
            >
              {st.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <button onClick={() => act({ action: "next" })} className="hover:text-primary" aria-label="Siguiente"><SkipForward className="h-4 w-4" /></button>
            <button onClick={() => act({ action: "repeat", state: nextRepeat }, { repeat: nextRepeat })} className={st.repeat !== "off" ? "text-primary" : "hover:text-primary"} aria-label="Repetir">
              {st.repeat === "track" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume ?? st.volume ?? 50}
          disabled={st.volume == null}
          onChange={(e) => setVolume(Number(e.target.value))}
          onMouseUp={(e) => act({ action: "volume", percent: Number((e.target as HTMLInputElement).value) })}
          onTouchEnd={(e) => act({ action: "volume", percent: Number((e.target as HTMLInputElement).value) })}
          className="flex-1 h-1 accent-primary disabled:opacity-40"
          aria-label="Volumen"
          title={st.volume == null ? "Este dispositivo no permite cambiar volumen" : "Volumen"}
        />
        <button onClick={() => setPanel(panel === "search" ? null : "search")} className={`p-1 ${panel === "search" ? "text-primary" : "hover:text-primary"}`} aria-label="Buscar canciones"><Search className="h-3.5 w-3.5" /></button>
        <button onClick={() => setPanel(panel === "playlists" ? null : "playlists")} className={`p-1 ${panel === "playlists" ? "text-primary" : "hover:text-primary"}`} aria-label="Mis playlists"><ListMusic className="h-3.5 w-3.5" /></button>
      </div>

      {panel === "search" && (
        <div className="mt-2 space-y-1.5">
          <form onSubmit={(e) => { e.preventDefault(); void runSearch(); }} className="flex gap-1.5">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca una canción o artista" className="flex-1 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-xs" />
            <button className="rounded-md border border-primary/40 px-2 text-xs">{searching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Buscar"}</button>
          </form>
          <ul className="max-h-48 overflow-y-auto space-y-1">
            {hits.map((h) => (
              <li key={h.id}>
                <button onClick={() => act({ action: "playUris", uris: [h.uri] })} className="flex w-full items-center gap-2 rounded-md p-1 text-left hover:bg-primary/10">
                  {h.cover && <img src={h.cover} alt="" className="h-7 w-7 rounded" />}
                  <span className="min-w-0"><span className="block truncate text-xs">{h.title}</span><span className="block truncate text-[10px] text-muted-foreground">{h.artist}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {panel === "playlists" && (
        <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
          {!pl && <li className="text-[10px] text-muted-foreground">Cargando…</li>}
          {pl && !pl.ok && <li className="text-[10px] text-destructive">{pl.message}</li>}
          {pl?.ok && pl.playlists.length === 0 && <li className="text-[10px] text-muted-foreground">No tienes playlists.</li>}
          {pl?.playlists.map((p) => (
            <li key={p.id}>
              <button onClick={() => act({ action: "playContext", contextUri: p.uri })} className="flex w-full items-center gap-2 rounded-md p-1 text-left hover:bg-primary/10">
                {p.cover ? <img src={p.cover} alt="" className="h-7 w-7 rounded" /> : <ListMusic className="h-4 w-4" />}
                <span className="truncate text-xs">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>,
  );
}
