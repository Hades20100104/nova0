export function PerfGauge({ value = 98, label = "ÓPTIMO" }: { value?: number; label?: string }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="px-3 pb-2">
      <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Rendimiento</div>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="color-mix(in oklab, var(--primary) 18%, transparent)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r={r} fill="none"
              stroke="var(--primary)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-base leading-none glow-text">{value}%</div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">{label}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          {[
            { k: "CPU", v: 32 },
            { k: "MEM", v: 68 },
            { k: "DISCO", v: 45 },
            { k: "RED", v: 28 },
          ].map((r) => (
            <div key={r.k} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-10 text-muted-foreground">{r.k}</span>
              <div className="flex-1 h-1 rounded bg-card/60 overflow-hidden">
                <div className="h-full rounded bg-primary" style={{ width: `${r.v}%`, boxShadow: "0 0 8px var(--glow)" }} />
              </div>
              <span className="w-7 text-right text-primary">{r.v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
