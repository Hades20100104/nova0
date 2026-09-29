import { Mic } from "lucide-react";
import { Waveform } from "./Waveform";

export function ListeningWidget() {
  return (
    <div
      className="relative overflow-hidden flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-xl p-3"
      style={{
        boxShadow:
          "0 0 26px color-mix(in oklab, var(--glow) 22%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 18%, transparent)",
      }}
    >
      {/* corner ticks */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-2 w-2 border-l border-t border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 border-r border-t border-primary/60" />
      <span className="pointer-events-none absolute left-1.5 bottom-1.5 h-2 w-2 border-l border-b border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 bottom-1.5 h-2 w-2 border-r border-b border-primary/60" />

      {/* mic with halo */}
      <div className="relative">
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: "color-mix(in oklab, var(--primary) 35%, transparent)",
            animationDuration: "2.4s",
          }}
        />
        <button
          className="relative grid h-11 w-11 place-items-center rounded-full border border-primary"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--primary) 65%, white), color-mix(in oklab, var(--accent) 50%, transparent))",
            boxShadow: "0 0 18px var(--glow), inset 0 0 10px color-mix(in oklab, var(--primary) 60%, transparent)",
          }}
        >
          <Mic className="h-4 w-4 text-background" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display glow-text">NOVA está escuchando…</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
              style={{ boxShadow: "0 0 8px var(--accent)" }}
            />
            REC
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">Di lo que necesitas</div>
        <div className="mt-1.5">
          <Waveform bars={48} color="var(--primary)" height={28} variant="pulse" speed={60} />
        </div>
      </div>
    </div>
  );
}
