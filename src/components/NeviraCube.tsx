import { NEVIRA_MODULES } from "@/lib/modules";
import { Icon3D } from "@/components/Icon3D";

// Reactive HUD speed per module
const REACT: Record<string, { scan: string; core: string; node: string; ring: string }> = {
  panel:            { scan: "6s",   core: "2s",   node: "3.5s", ring: "12s" },
  productividad:    { scan: "4s",   core: "1.6s", node: "2.6s", ring: "10s" },
  analisis:         { scan: "3s",   core: "1.2s", node: "2s",   ring: "8s"  },
  automatizaciones: { scan: "2.4s", core: "1.4s", node: "1.8s", ring: "7s"  },
  datos:            { scan: "3.5s", core: "1.6s", node: "2.4s", ring: "9s"  },
  comunicacion:     { scan: "5s",   core: "1.8s", node: "2.2s", ring: "11s" },
  memoria:          { scan: "7s",   core: "2.2s", node: "3.8s", ring: "14s" },
  seguridad:        { scan: "1.8s", core: "1s",   node: "1.5s", ring: "6s"  },
  sistema:          { scan: "4s",   core: "1.6s", node: "2.6s", ring: "10s" },
  rendimiento:      { scan: "1.6s", core: "0.9s", node: "1.2s", ring: "5s"  },
  codigo:           { scan: "3s",   core: "1.4s", node: "2s",   ring: "8s"  },
  ajustes:          { scan: "6s",   core: "2s",   node: "3.5s", ring: "12s" },
};

export function NeviraCube({ onSelect, active }: { onSelect: (slug: string) => void; active: string }) {
  const items = NEVIRA_MODULES.filter((m) => m.slug !== "panel");
  const r = REACT[active] ?? REACT.panel;
  const style = {
    "--scan-speed": r.scan,
    "--core-speed": r.core,
    "--node-speed": r.node,
    "--ring-speed": r.ring,
  } as React.CSSProperties;
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={style}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="hud-ring hud-ring-1" />
        <div className="hud-ring hud-ring-2" />
        <div className="hud-ring hud-ring-3" />
      </div>

      <div className="pointer-events-none absolute inset-0 scan-beam" />

      <div className="cube-scene">
        <div className="cube">
          {["CORE/01","SYS/02","NET/03","MEM/04","PWR/05","I/O 06"].map((label, i) => (
            <div key={label} className={`face f${i+1}`}>
              <div className="face-grid" />
              <div className="face-corner tl" /><div className="face-corner tr" />
              <div className="face-corner bl" /><div className="face-corner br" />
              <span className="face-label">{label}</span>
            </div>
          ))}
          <div className="cube-inner" />
          <div className="cube-core" />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {items.map((m, i) => {
          const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 38;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          const Icon = m.icon;
          const isActive = active === m.slug;
          return (
            <button
              key={m.slug}
              onClick={() => onSelect(m.slug)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center gap-1.5 transition"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={m.label}
            >
              <Icon3D className="h-14 w-14" active={isActive}>
                <Icon className="h-6 w-6" />
              </Icon3D>
              <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/85 whitespace-nowrap font-mono">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
