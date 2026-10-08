import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Volume2, VolumeX, Shuffle, Send, Play, ListPlus, Loader2, Power } from "lucide-react";
import { runDj, VIBES, type Vibe, type DjResult } from "@/lib/dj.functions";
import { controlPlayer, type PlayerState, type TrackHit } from "@/lib/spotify-player.functions";
import { loadVoicePrefs, speak, stopSpeaking } from "@/lib/voice";

const VIBE_LABEL: Record<Vibe, string> = {
  enfoque: "Enfoque",
  chill: "Chill",
  fiesta: "Fiesta",
  workout: "Workout",
  descubrimiento: "Descubrimiento",
};

export function DjPanel() {
  const qc = useQueryClient();
  const dj = useServerFn(runDj);
  const control = useServerFn(controlPlayer);
  const [on, setOn] = useState(false);
  const [vibe, setVibe] = useState<Vibe>("chill");
  const [voice, setVoice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string>("");
  const [tracks, setTracks] = useState<TrackHit[]>([]);
  const [q, setQ] = useState("");
  const lastTrack = useRef<string | undefined>(undefined);
  const lastTransitionAt = useRef(0);

  const say = (text: string) => {
    setLine(text);
    if (voice) {
      const prefs = loadVoicePrefs().nova;
      speak(text, { ...prefs, enabled: true });
    }
  };

  const current = () => qc.getQueryData<PlayerState>(["spotify-player"]);

  const call = async (mode: "set" | "ask" | "transition", extra?: { vibe?: Vibe; question?: string }) => {
    setBusy(true);
    const st = current();
    const res: DjResult = await dj({
      data: {
        mode,
        vibe: extra?.vibe ?? vibe,
        question: extra?.question,
        current: st?.title ? { title: st.title, artist: st.artist ?? "" } : undefined,
      },
    }).catch((e) => ({ ok: false as const, message: e instanceof Error ? e.message : "Error" }));
    setBusy(false);
    if (!res.ok) {
      toast.error(res.message);
      return null;
    }
    say(res.commentary);
    if (res.tracks.length) setTracks(res.tracks);
    return res;
  };

  const play = async (uris: string[]) => {
    const r = await control({ data: { action: "playUris", uris } });
    if (!r.ok) toast.error(r.message ?? "No se pudo reproducir");
    setTimeout(() => qc.invalidateQueries({ queryKey: ["spotify-player"] }), 700);
  };
  const enqueue = async (t: TrackHit) => {
    const r = await control({ data: { action: "queue", uri: t.uri } });
    if (r.ok) toast.success(`En cola: ${t.title}`);
    else toast.error(r.message ?? "No se pudo encolar");
  };

  const start = async () => {
    setOn(true);
    const res = await call("set");
    if (res?.tracks.length) await play(res.tracks.map((t) => t.uri));
  };
  const stop = () => {
    setOn(false);
    stopSpeaking();
  };
  const changeVibe = async (v: Vibe) => {
    setVibe(v);
    if (!on) return;
    const res = await call("set", { vibe: v });
    if (res?.tracks.length) await play(res.tracks.map((t) => t.uri));
  };

  // Live transitions: comment when the track changes (at most every 90s)
  useEffect(() => {
    if (!on) return;
    const unsub = qc.getQueryCache().subscribe((ev) => {
      if (ev.query.queryKey[0] !== "spotify-player") return;
      const st = ev.query.state.data as PlayerState | undefined;
      if (!st?.trackId || st.trackId === lastTrack.current) return;
      const first = lastTrack.current === undefined;
      lastTrack.current = st.trackId;
      if (first || busy || Date.now() - lastTransitionAt.current < 90_000) return;
      lastTransitionAt.current = Date.now();
      void call("transition");
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, vibe, voice]);

  useEffect(() => () => stopSpeaking(), []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card/40 backdrop-blur-xl p-4"
      style={{ boxShadow: "0 0 40px color-mix(in oklab, var(--glow) 25%, transparent)" }}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-50"
        style={{
          background:
            "radial-gradient(80% 60% at 10% 0%, color-mix(in oklab, var(--accent) 25%, transparent), transparent 60%), radial-gradient(80% 60% at 100% 100%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 60%)",
        }}
      />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`relative grid h-9 w-9 place-items-center rounded-full border border-primary/50 bg-primary/15 ${on ? "dj-pulse" : ""}`}>
              <Radio className="h-4 w-4 text-primary" />
            </span>
            <div>
              <div className="font-display text-sm tracking-[0.3em] glow-text">DJ AURA</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                {on ? (busy ? "Mezclando…" : `En vivo · ${VIBE_LABEL[vibe]}`) : "Fuera del aire"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setVoice((v) => !v); if (voice) stopSpeaking(); }}
              className="grid h-8 w-8 place-items-center rounded-full border border-primary/30 hover:border-primary transition"
              aria-label={voice ? "Silenciar voz del DJ" : "Activar voz del DJ"}
              title={voice ? "Silenciar locutora" : "Activar locutora"}
            >
              {voice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button
              onClick={on ? stop : start}
              disabled={busy}
              className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium transition ${on ? "border border-primary/50 bg-primary/20" : "bg-gradient-to-r from-primary to-accent text-primary-foreground"}`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
              {on ? "Apagar" : "Encender DJ"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VIBES.map((v) => (
            <button
              key={v}
              onClick={() => changeVibe(v)}
              disabled={busy}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${vibe === v ? "border-primary bg-primary/25 text-foreground" : "border-primary/25 text-muted-foreground hover:border-primary/60"}`}
            >
              {VIBE_LABEL[v]}
            </button>
          ))}
          <button
            onClick={() => changeVibe(VIBES[(VIBES.indexOf(vibe) + 1) % VIBES.length])}
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-accent/40 px-2.5 py-1 text-[11px] hover:bg-accent/15"
          >
            <Shuffle className="h-3 w-3" /> Cambiar vibra
          </button>
        </div>

        <div className="min-h-[48px] rounded-xl border border-primary/20 bg-background/30 p-2.5 text-xs leading-relaxed">
          {line ? (
            <span className="italic">“{line}”</span>
          ) : (
            <span className="text-muted-foreground">Enciende el DJ y AURA armará una sesión según tu vibra y lo que sueles escuchar.</span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            void call("ask", { question: q.trim() });
            setQ("");
          }}
          className="flex gap-1.5"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pregúntale al DJ o pide una recomendación…"
            maxLength={300}
            className="flex-1 rounded-full border border-primary/30 bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
          <button disabled={busy} className="grid h-8 w-8 place-items-center rounded-full border border-primary/40 hover:bg-primary/20" aria-label="Enviar al DJ">
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        {tracks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary/80">Selección del DJ</span>
              <button onClick={() => play(tracks.map((t) => t.uri))} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <Play className="h-3 w-3" /> Reproducir todo
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto space-y-1">
              {tracks.map((t) => (
                <li key={t.id} className="group flex items-center gap-2 rounded-lg p-1 hover:bg-primary/10">
                  {t.cover && <img src={t.cover} alt="" className="h-8 w-8 rounded" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{t.title}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{t.artist}</span>
                  </span>
                  <button onClick={() => play([t.uri])} className="p-1 hover:text-primary" aria-label={`Reproducir ${t.title}`}><Play className="h-3.5 w-3.5" /></button>
                  <button onClick={() => enqueue(t)} className="p-1 hover:text-primary" aria-label={`Encolar ${t.title}`}><ListPlus className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
