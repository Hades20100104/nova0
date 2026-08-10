import { useMemo, useState } from "react";
import { STATUS_META } from "@/lib/merlin";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export type MapConcept = {
  id: string;
  name: string;
  area?: string | null;
  overall: number;
  confidence: number;
  status: string;
};
export type MapRelation = { from_concept: string; to_concept: string; kind: string };

const W = 900;
const H = 620;

export function KnowledgeMap({
  concepts,
  relations,
  selected,
  onSelect,
}: {
  concepts: MapConcept[];
  relations: MapRelation[];
  selected?: string | null;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  const positions = useMemo(() => {
    // Profundidad por prerrequisitos → anillos concéntricos
    const depth = new Map<string, number>();
    concepts.forEach((c) => depth.set(c.id, 0));
    for (let pass = 0; pass < 6; pass++) {
      for (const r of relations) {
        if (r.kind !== "prerequisite") continue;
        const d = (depth.get(r.from_concept) ?? 0) + 1;
        if (d > (depth.get(r.to_concept) ?? 0)) depth.set(r.to_concept, Math.min(d, 4));
      }
    }
    const rings = new Map<number, string[]>();
    concepts.forEach((c) => {
      const d = depth.get(c.id) ?? 0;
      rings.set(d, [...(rings.get(d) ?? []), c.id]);
    });
    const pos = new Map<string, { x: number; y: number }>();
    [...rings.entries()].forEach(([d, ids]) => {
      const radius = 90 + d * 115;
      ids.forEach((id, i) => {
        const angle = (i / Math.max(1, ids.length)) * Math.PI * 2 + d * 0.7;
        pos.set(id, { x: W / 2 + Math.cos(angle) * radius, y: H / 2 + Math.sin(angle) * radius * 0.78 });
      });
    });
    return pos;
  }, [concepts, relations]);

  const color = (c: MapConcept) => STATUS_META[c.status]?.color ?? STATUS_META.not_started.color;

  return (
    <div className="relative rounded-2xl border border-primary/25 bg-background/40 overflow-hidden">
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
        {[
          { icon: ZoomIn, fn: () => setZoom((z) => Math.min(2.2, z + 0.2)), label: "Acercar" },
          { icon: ZoomOut, fn: () => setZoom((z) => Math.max(0.5, z - 0.2)), label: "Alejar" },
          { icon: Maximize2, fn: () => { setZoom(1); setDrag({ x: 0, y: 0 }); }, label: "Centrar" },
        ].map(({ icon: Icon, fn, label }) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label}
            className="grid h-8 w-8 place-items-center rounded-lg border border-primary/30 bg-background/70 hover:bg-primary/20 transition"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[440px] md:h-[560px] cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => setOrigin({ x: e.clientX - drag.x, y: e.clientY - drag.y })}
        onPointerUp={() => setOrigin(null)}
        onPointerLeave={() => setOrigin(null)}
        onPointerMove={(e) => origin && setDrag({ x: e.clientX - origin.x, y: e.clientY - origin.y })}
      >
        <defs>
          <radialGradient id="mnode" cx="35%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${drag.x} ${drag.y}) scale(${zoom}) translate(${(W * (1 - zoom)) / (2 * zoom)} ${(H * (1 - zoom)) / (2 * zoom)})`}>
          {relations.map((r, i) => {
            const a = positions.get(r.from_concept);
            const b = positions.get(r.to_concept);
            if (!a || !b) return null;
            const dim = selected && selected !== r.from_concept && selected !== r.to_concept;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="var(--primary)"
                strokeOpacity={dim ? 0.1 : r.kind === "prerequisite" ? 0.55 : 0.28}
                strokeWidth={r.kind === "prerequisite" ? 1.6 : 1}
                strokeDasharray={r.kind === "prerequisite" ? "0" : r.kind === "helps" ? "6 4" : "2 5"}
              />
            );
          })}
          {concepts.map((c) => {
            const p = positions.get(c.id);
            if (!p) return null;
            const active = selected === c.id;
            const radius = 22 + (c.overall / 100) * 12;
            return (
              <g key={c.id} onClick={() => onSelect(c.id)} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r={radius + (active ? 12 : 7)} fill={color(c)} opacity={active ? 0.22 : 0.1} />
                <circle cx={p.x} cy={p.y} r={radius} fill={color(c)} opacity={0.85} />
                <circle cx={p.x} cy={p.y} r={radius} fill="url(#mnode)" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#08111f">
                  {c.overall}%
                </text>
                <text x={p.x} y={p.y + radius + 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity={0.85}>
                  {c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="flex flex-wrap gap-3 border-t border-primary/20 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: v.color }} /> {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}
