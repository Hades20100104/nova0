import { Play, SkipBack, SkipForward, Shuffle, Pause, Repeat, Heart } from "lucide-react";
import { useEffect, useState } from "react";

export function MusicPlayerWidget() {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(38);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.4));
    }, 400);
    return () => clearInterval(id);
  }, [playing]);

  const total = 218; // seconds (3:38)
  const current = Math.floor((progress / 100) * total);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-xl p-3"
      style={{
        boxShadow:
          "0 0 30px color-mix(in oklab, var(--glow) 22%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 18%, transparent)",
      }}
    >
      {/* Ambient aura */}
      <div
        className="pointer-events-none absolute -inset-px opacity-60"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 50%), radial-gradient(120% 80% at 100% 100%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 55%)",
        }}
      />
      {/* Corner ticks */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-2 w-2 border-l border-t border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 border-r border-t border-primary/60" />
      <span className="pointer-events-none absolute left-1.5 bottom-1.5 h-2 w-2 border-l border-b border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 bottom-1.5 h-2 w-2 border-r border-b border-primary/60" />

      <div className="relative flex items-center gap-3">
        {/* Cover */}
        <div className="relative h-20 w-20 shrink-0">
          <div
            className="absolute inset-0 rounded-xl border border-primary/40 overflow-hidden"
            style={{
              background:
                "conic-gradient(from 200deg at 50% 50%, oklch(0.78 0.25 320), oklch(0.45 0.22 290), oklch(0.6 0.25 25), oklch(0.78 0.25 320))",
              boxShadow:
                "0 0 22px var(--glow), inset 0 0 22px color-mix(in oklab, var(--accent) 35%, transparent)",
              animation: playing ? "spin 18s linear infinite" : "none",
            }}
          />
          {/* vinyl ring */}
          <div className="absolute inset-2 rounded-full border border-white/15" />
          <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-background border border-primary/60" />
          {/* sheen */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground font-mono">
                Now Playing
              </div>
              <div className="font-display text-sm truncate glow-text">Interstellar Dreams</div>
              <div className="text-[10px] text-muted-foreground truncate">
                NOVA · Lo-Fi · Chill · 2024
              </div>
            </div>
            <button
              onClick={() => setLiked((l) => !l)}
              className="grid h-7 w-7 place-items-center rounded-full border border-primary/30 hover:border-primary transition"
            >
              <Heart
                className={`h-3.5 w-3.5 transition ${
                  liked ? "fill-accent text-accent" : "text-foreground/60"
                }`}
              />
            </button>
          </div>

          {/* progress */}
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[9px] text-muted-foreground w-7 text-right">
              {fmt(current)}
            </span>
            <div className="relative flex-1 h-1 rounded-full bg-card/80 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, var(--primary), var(--accent))",
                  boxShadow: "0 0 8px var(--glow)",
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-foreground"
                style={{
                  left: `calc(${progress}% - 4px)`,
                  boxShadow: "0 0 10px var(--glow)",
                }}
              />
            </div>
            <span className="font-mono text-[9px] text-muted-foreground w-7">
              {fmt(total)}
            </span>
          </div>

          {/* controls */}
          <div className="mt-1.5 flex items-center justify-center gap-3 text-foreground/80">
            <button className="hover:text-primary transition">
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button className="hover:text-primary transition">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-background hover:scale-105 transition"
              style={{ boxShadow: "0 0 16px var(--glow)" }}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <button className="hover:text-primary transition">
              <SkipForward className="h-4 w-4" />
            </button>
            <button className="hover:text-primary transition">
              <Repeat className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
