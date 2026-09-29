import { useMemo } from "react";
import { MERLIN_DATA, conceptById, globalProgress } from "@/lib/merlin/mock";
import { STATUS_LABEL, type ConceptStatus } from "@/lib/merlin/types";

/**
 * Parte 5 — Progreso.
 * El progreso no es un porcentaje de temario cubierto: es el estado real
 * del modelo de conocimiento y la evidencia que lo sostiene.
 */
export function ProgressPanel() {
  const progress = globalProgress();

  const byUnit = useMemo(() => {
    const map = new Map<string, { unit: string; items: { name: string; overall: number; status: ConceptStatus }[] }>();
    for (const p of MERLIN_DATA.personal) {
      const c = conceptById(p.conceptId);
      if (!c) continue;
      const entry = map.get(c.curriculumUnit) ?? { unit: c.curriculumUnit, items: [] };
      entry.items.push({ name: c.name, overall: p.overall, status: p.status });
      map.set(c.curriculumUnit, entry);
    }
    return [...map.values()];
  }, []);

  const counts = useMemo(() => {
    const c: Record<ConceptStatus, number> = { dominado: 0, en_desarrollo: 0, requiere_atencion: 0, no_iniciado: 0 };
    MERLIN_DATA.personal.forEach((p) => (c[p.status] += 1));
    return c;
  }, []);

  const timeline = useMemo(
    () => [...MERLIN_DATA.evidence].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [],
  );

  return (
    <section className="w-full max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Progreso</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide">Estado real de tu modelo</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Dominio global</p>
          <p className="font-display text-3xl glow-text">{progress}%</p>
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Por unidad</p>
          <div className="mt-4 space-y-5">
            {byUnit.map((u) => {
              const avg = Math.round(u.items.reduce((a, i) => a + i.overall, 0) / u.items.length);
              return (
                <div key={u.unit}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/85">{u.unit}</span>
                    <span className="text-muted-foreground">{avg}%</span>
                  </div>
                  <div className="ku-bar mt-2">
                    <i style={{ width: `${avg}%` }} />
                  </div>
                  <ul className="mt-3 space-y-2">
                    {u.items.map((i) => (
                      <li key={i.name} className="flex items-center gap-3 text-[11px]">
                        <span className="w-36 shrink-0 truncate text-foreground/75">{i.name}</span>
                        <div className="ku-bar flex-1">
                          <i style={{ width: `${i.overall}%` }} />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{i.overall}</span>
                        <span className="w-32 text-right uppercase tracking-[0.16em] text-muted-foreground/70">
                          {STATUS_LABEL[i.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Distribución</p>
            <ul className="mt-4 space-y-2 text-xs">
              {(Object.keys(counts) as ConceptStatus[]).map((k) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-foreground/80">{STATUS_LABEL[k]}</span>
                  <span className="text-muted-foreground">{counts[k]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Un concepto solo pasa a “dominado” cuando la aplicación y la retención acompañan a la comprensión.
            </p>
          </div>

          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Evidencia reciente</p>
            <ul className="mt-4 space-y-3">
              {timeline.map((e) => (
                <li key={e.id} className="border-l border-primary/20 pl-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground/85">{conceptById(e.conceptId)?.name}</span>
                    <span className="text-muted-foreground">{e.date}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {e.type} · {e.result} · confianza {e.confidence}%
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">{e.context}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
