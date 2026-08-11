import { useMemo } from "react";
import { MERLIN_STATE_HINT, MERLIN_STATE_LABEL } from "@/lib/merlin/state";
import type { MerlinState } from "@/lib/merlin/types";

/**
 * Núcleo de Merlin: estructura cristalina tridimensional cuyo comportamiento
 * cambia según el estado cognitivo. No es un avatar ni una mascota.
 */
export function MerlinCore({
  state,
  size = 300,
  showLabel = true,
}: {
  state: MerlinState;
  size?: number;
  showLabel?: boolean;
}) {
  const nodes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 38 + (i % 3) * 6;
        return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r * 0.62, d: (i % 5) * 0.7 };
      }),
    [],
  );

  return (
    <div className="flex flex-col items-center gap-5" data-state={state}>
      <div className={`merlin-core merlin-core--${state}`} style={{ width: size, height: size }}>
        <div className="merlin-core__halo" />
        <div className="merlin-core__ring merlin-core__ring--a" />
        <div className="merlin-core__ring merlin-core__ring--b" />
        <div className="merlin-core__ring merlin-core__ring--c" />

        <svg viewBox="0 0 100 100" className="merlin-core__svg" aria-hidden="true">
          <defs>
            <linearGradient id="merlin-facet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
              <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--glow)" stopOpacity="0.7" />
            </linearGradient>
            <radialGradient id="merlin-inner" cx="50%" cy="45%">
              <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* conexiones internas: el conocimiento como estructura */}
          <g className="merlin-core__web">
            {nodes.map((n, i) => (
              <line key={i} x1="50" y1="50" x2={n.x} y2={n.y} stroke="url(#merlin-facet)" strokeWidth="0.4" />
            ))}
          </g>

          {/* poliedro cristalino */}
          <g className="merlin-core__crystal">
            <polygon points="50,10 82,50 50,90 18,50" fill="url(#merlin-facet)" stroke="var(--glow)" strokeWidth="0.6" />
            <polygon points="50,10 68,38 50,50 32,38" fill="var(--primary)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="0.35" />
            <polygon points="50,90 68,62 50,50 32,62" fill="var(--accent)" fillOpacity="0.14" stroke="var(--glow)" strokeWidth="0.35" />
            <line x1="18" y1="50" x2="82" y2="50" stroke="var(--accent)" strokeWidth="0.35" opacity="0.7" />
          </g>

          <circle cx="50" cy="50" r="16" fill="url(#merlin-inner)" className="merlin-core__pulse" />

          {nodes.map((n, i) => (
            <circle
              key={`n${i}`}
              cx={n.x}
              cy={n.y}
              r="1.1"
              fill="var(--glow)"
              className="merlin-core__node"
              style={{ animationDelay: `${n.d}s` }}
            />
          ))}
        </svg>
      </div>

      {showLabel && (
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80">{MERLIN_STATE_LABEL[state]}</p>
          <p className="mt-1 text-xs text-muted-foreground">{MERLIN_STATE_HINT[state]}</p>
        </div>
      )}
    </div>
  );
}
