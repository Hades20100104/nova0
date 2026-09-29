import { useEffect, useState } from "react";

function useTicker(min: number, max: number, ms = 1400) {
  const [v, setV] = useState(() => Math.round(min + Math.random() * (max - min)));
  useEffect(() => {
    const id = setInterval(() => setV(Math.round(min + Math.random() * (max - min))), ms);
    return () => clearInterval(id);
  }, [min, max, ms]);
  return v;
}

export function HudTelemetry({ variant = "nevira" }: { variant?: "nevira" | "nova" }) {
  const cpu = useTicker(38, 72);
  const mem = useTicker(44, 81);
  const net = useTicker(120, 880, 900);
  const sig = useTicker(82, 99, 2200);

  const items =
    variant === "nevira"
      ? [
          { k: "CPU", v: `${cpu}%` },
          { k: "MEM", v: `${mem}%` },
          { k: "NET", v: `${net} kb/s` },
          { k: "SYS", v: `${sig}%` },
        ]
      : [
          { k: "AURA", v: `${sig}%` },
          { k: "FLUX", v: `${cpu}` },
          { k: "RES", v: `${mem}Hz` },
          { k: "ORB", v: `${net}`.padStart(3, "0") },
        ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span>{variant === "nevira" ? "NEVIRA · ONLINE" : "NOVA · IRRADIANDO"}</span>
      </div>
      <div className="flex gap-4">
        {items.map((i) => (
          <div key={i.k} className="flex items-baseline gap-1.5">
            <span className="text-foreground/40">{i.k}</span>
            <span className="text-primary">{i.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HudCorners() {
  return (
    <div className="pointer-events-none absolute inset-3 z-10">
      <span className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-primary/60" />
      <span className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-primary/60" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-primary/60" />
      <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-primary/60" />
    </div>
  );
}
