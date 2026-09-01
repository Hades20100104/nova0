import { useMemo, useState } from "react";
import {
  MERLIN_DATA,
  conceptById,
  evidenceOf,
  personalById,
  relationsOf,
  strategyById,
} from "@/lib/merlin/mock";
import {
  RELATION_LABEL,
  STATUS_LABEL,
  type ConceptStatus,
  type MapLayer,
  type Priority,
} from "@/lib/merlin/types";

const LAYERS: { id: MapLayer; label: string; hint: string }[] = [
  { id: "curriculo", label: "Currículo", hint: "Lo que debería existir según el programa" },
  { id: "personal", label: "Mi mapa", hint: "Lo que realmente sabes, según la evidencia" },
  { id: "combinado", label: "Combinado", hint: "Tu mapa sobre el currículo: la brecha visible" },
];

const STATUS_CLASS: Record<ConceptStatus, string> = {
  dominado: "ku-node--dominado",
  en_desarrollo: "ku-node--desarrollo",
  requiere_atencion: "ku-node--atencion",
  no_iniciado: "ku-node--inicio",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  baja: "Prioridad baja",
  media: "Prioridad media",
  alta: "Prioridad alta",
  critica: "Prioridad crítica",
};

export function KnowledgeUniverse() {
  const [layer, setLayer] = useState<MapLayer>("combinado");
  const [selected, setSelected] = useState<string | null>("limites");
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      MERLIN_DATA.concepts.map((c) => {
        const p = personalById(c.id)!;
        return { concept: c, personal: p };
      }),
    [],
  );

  const focus = selected ?? hovered;
  const linked = useMemo(() => {
    if (!focus) return new Set<string>();
    const s = new Set<string>();
    relationsOf(focus).forEach((r) => {
      s.add(r.from);
      s.add(r.to);
    });
    return s;
  }, [focus]);

  const sel = selected ? conceptById(selected) : undefined;
  const selP = selected ? personalById(selected) : undefined;

  return (
    <section className="w-full">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide text-foreground">Mapa de conocimiento</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {LAYERS.find((l) => l.id === layer)?.hint}
          </p>
        </div>
        <div className="merlin-panel flex gap-1 p-1">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={`rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-all ${
                layer === l.id
                  ? "bg-primary/15 text-primary shadow-[0_0_20px_-8px_var(--glow)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="merlin-panel ku-stage relative overflow-hidden p-2">
          <svg viewBox="0 0 100 100" className="h-[440px] w-full" role="img" aria-label="Universo de conceptos">
            {MERLIN_DATA.relationships.map((r, i) => {
              const a = personalById(r.from)!;
              const b = personalById(r.to)!;
              const active = focus ? r.from === focus || r.to === focus : false;
              const dim = layer === "personal" && (a.status === "no_iniciado" || b.status === "no_iniciado");
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={`ku-edge ${active ? "ku-edge--active" : ""} ${r.kind !== "prerrequisito" ? "ku-edge--soft" : ""}`}
                  opacity={dim ? 0.08 : undefined}
                />
              );
            })}

            {nodes.map(({ concept, personal }) => {
              const r = 2 + concept.weight * 0.72;
              const isFocus = focus === concept.id;
              const isLinked = linked.has(concept.id);
              const mastery = personal.overall / 100;
              const showMastery = layer !== "curriculo";
              return (
                <g
                  key={concept.id}
                  className={`ku-node ${STATUS_CLASS[personal.status]} ${isFocus ? "ku-node--focus" : ""} ${
                    focus && !isFocus && !isLinked ? "ku-node--dim" : ""
                  }`}
                  onMouseEnter={() => setHovered(concept.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(concept.id)}
                >
                  <circle cx={personal.x} cy={personal.y} r={r + 2.6} className="ku-node__halo" />
                  <circle cx={personal.x} cy={personal.y} r={r} className="ku-node__ring" />
                  {showMastery && (
                    <circle
                      cx={personal.x}
                      cy={personal.y}
                      r={Math.max(0.6, r * mastery)}
                      className="ku-node__fill"
                    />
                  )}
                  <text x={personal.x} y={personal.y + r + 3.4} className="ku-node__label">
                    {concept.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {(Object.keys(STATUS_LABEL) as ConceptStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <i className={`ku-dot ${STATUS_CLASS[s]}`} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        <aside className="merlin-panel p-6">
          {sel && selP ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/80">{sel.curriculumUnit}</p>
              <h3 className="mt-2 font-display text-2xl tracking-wide text-foreground">{sel.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {STATUS_LABEL[selP.status]} · {PRIORITY_LABEL[selP.priority]}
              </p>

              <div className="mt-5 space-y-2.5">
                {(
                  [
                    ["Comprensión", selP.mastery.comprension],
                    ["Aplicación", selP.mastery.aplicacion],
                    ["Transferencia", selP.mastery.transferencia],
                    ["Retención", selP.mastery.retencion],
                    ["Teoría", selP.mastery.teoria],
                    ["Práctica", selP.mastery.practica],
                  ] as [string, number][]
                ).map(([label, v]) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{label}</span>
                      <span className="text-foreground/80">{v}%</span>
                    </div>
                    <div className="ku-bar mt-1">
                      <i style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                <span className="text-muted-foreground">Dominio general</span>
                <span className="font-display text-lg text-primary">{selP.overall}%</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Confianza de esta lectura: {selP.confidence}%. Un valor alto no implica dominio absoluto.
              </p>

              {selP.breakdown && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Subconceptos detectados por Merlin
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {selP.breakdown.map((b) => (
                      <li key={b} className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-foreground/80">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Relaciones</p>
                <ul className="mt-2 space-y-1.5 text-[12px]">
                  {relationsOf(sel.id).map((r, i) => (
                    <li key={i} className="text-muted-foreground">
                      <button
                        className="text-foreground/90 hover:text-primary"
                        onClick={() => setSelected(r.from === sel.id ? r.to : r.from)}
                      >
                        {conceptById(r.from === sel.id ? r.to : r.from)?.name}
                      </button>{" "}
                      <span className="text-primary/70">
                        {r.from === sel.id ? RELATION_LABEL[r.kind] : `es ${RELATION_LABEL[r.kind]} de`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Evidencia reciente</p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                  {evidenceOf(sel.id).length === 0 && <li>Sin evidencia todavía.</li>}
                  {evidenceOf(sel.id).map((e) => (
                    <li key={e.id} className="flex items-start gap-2">
                      <i className={`ku-ev ku-ev--${e.result}`} />
                      <span>
                        <span className="text-foreground/85">{e.context}</span> · {e.type} · {e.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-5 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
                Estrategia en uso:{" "}
                <span className="text-foreground/85">{strategyById(selP.strategyId)?.type}</span> (
                {strategyById(selP.strategyId)?.effectiveness}% de efectividad). Si funciona, no se cambia.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecciona un concepto del universo.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
