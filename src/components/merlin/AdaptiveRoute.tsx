import { useMemo, useState } from "react";
import { MERLIN_DATA, conceptById, personalById, strategyById } from "@/lib/merlin/mock";
import { MODE_LABEL, meetsThreshold, type RouteStep } from "@/lib/merlin/types";
import { pulseMerlinState } from "@/lib/merlin/state";

/**
 * Parte 3 — Ruta adaptativa.
 * La ruta no es un temario: es una secuencia justificada por evidencia,
 * con decisiones auditables y capacidad de reorganizarse.
 */
export function AdaptiveRoute() {
  const route = MERLIN_DATA.route;
  const [steps, setSteps] = useState<RouteStep[]>(route.steps);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [adapting, setAdapting] = useState(false);
  const [inserted, setInserted] = useState(false);

  const doneCount = steps.filter((s) => s.done).length;
  const totalMin = steps.reduce((a, s) => a + s.minutes, 0);
  const restMin = steps.filter((s) => !s.done).reduce((a, s) => a + s.minutes, 0);
  const activeId = steps.find((s) => !s.done)?.id;

  const toggle = (id: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  /** Reorganización real: inserta práctica contextual antes del salto a límites. */
  const adapt = () => {
    if (inserted) return;
    setAdapting(true);
    pulseMerlinState("adaptando", 2400);
    setTimeout(() => {
      setSteps((prev) => {
        const i = prev.findIndex((s) => s.conceptId === "limites");
        const extra: RouteStep = {
          id: "st-adapt",
          conceptId: "desigualdades",
          label: "Práctica contextual de desigualdades",
          mode: "practicar",
          minutes: 12,
          reason: "La aplicación sigue por debajo de la comprensión; se refuerza antes de avanzar.",
          done: false,
        };
        const next = [...prev];
        next.splice(i < 0 ? prev.length : i, 0, extra);
        return next;
      });
      setInserted(true);
      setAdapting(false);
    }, 1600);
  };

  const weakest = useMemo(() => {
    return [...MERLIN_DATA.personal].sort((a, b) => a.overall - b.overall).slice(0, 3);
  }, []);

  return (
    <section className="w-full max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Ruta adaptativa</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide">{MERLIN_DATA.subject.name}</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>{doneCount}/{steps.length} pasos</span>
          <span className="opacity-40">·</span>
          <span>{restMin} min restantes de {totalMin}</span>
        </div>
      </header>

      {/* Por qué esta ruta */}
      <div className="merlin-panel mt-5 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Por qué esta ruta</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/85">{route.reason}</p>
          </div>
          <Confidence value={route.confidence} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={adapt}
            disabled={inserted || adapting}
            className="rounded-full border border-primary/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.24em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            {inserted ? "Ruta reorganizada" : adapting ? "Reorganizando…" : "Reevaluar ruta"}
          </button>
          <span className="text-xs text-muted-foreground">
            Merlin solo cambia la ruta cuando hay evidencia de fallo (regla de estabilidad).
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Secuencia */}
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Secuencia</p>
          <ol className="mt-4 space-y-1">
            {steps.map((s) => {
              const c = conceptById(s.conceptId);
              const p = personalById(s.conceptId);
              const st = p ? strategyById(p.strategyId) : undefined;
              const open = openStep === s.id;
              return (
                <li key={s.id} className={`mr-step ${s.done ? "mr-step--done" : ""} ${activeId === s.id ? "mr-step--active" : ""}`}>
                  <div className="flex items-start gap-3">
                    <button
                      aria-label={s.done ? "Marcar como pendiente" : "Marcar como completado"}
                      onClick={() => toggle(s.id)}
                      className="mr-step__dot"
                    />
                    <div className="min-w-0 flex-1 pb-4">
                      <button
                        onClick={() => setOpenStep(open ? null : s.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm text-foreground/90">{s.label}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {c?.name} · {MODE_LABEL[s.mode]} · {s.minutes} min
                        </p>
                      </button>
                      {open && (
                        <div className="mt-3 rounded-xl border border-primary/15 bg-background/40 p-3 text-xs text-muted-foreground">
                          <p><span className="text-foreground/70">Motivo:</span> {s.reason}</p>
                          {p && (
                            <p className="mt-1">
                              <span className="text-foreground/70">Dominio actual:</span> {p.overall}% · aplicación {p.mastery.aplicacion}%
                            </p>
                          )}
                          {st && (
                            <p className="mt-1">
                              <span className="text-foreground/70">Estrategia:</span> {st.type} ({st.effectiveness}%)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-6">
          {/* Prioridades reales */}
          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Cuellos de botella</p>
            <ul className="mt-4 space-y-3">
              {weakest.map((p) => (
                <li key={p.conceptId}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/85">{conceptById(p.conceptId)?.name}</span>
                    <span className="text-muted-foreground">{p.overall}%</span>
                  </div>
                  <div className="ku-bar mt-2">
                    <i style={{ width: `${p.overall}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Prioridad {p.priority}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Decisiones auditables */}
          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Decisiones de Merlin</p>
            <ul className="mt-4 space-y-4">
              {MERLIN_DATA.decisions.map((d) => (
                <li key={d.id} className="border-l border-primary/20 pl-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground/90">{d.title}</p>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{d.outcome}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{d.motive}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">Evidencia: {d.evidence}</p>
                  <p className="mt-1 text-xs text-foreground/70">Acción: {d.action}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Confianza {d.confidence}% · {meetsThreshold(d.confidence, "alta") ? "supera el umbral" : "en observación"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Confidence({ value }: { value: number }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Confianza</p>
      <p className="font-display text-3xl glow-text">{value}%</p>
    </div>
  );
}
