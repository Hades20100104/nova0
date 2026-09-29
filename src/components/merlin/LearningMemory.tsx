import { useMemo, useState } from "react";
import { MERLIN_DATA, conceptById } from "@/lib/merlin/mock";
import { meetsThreshold, type MemoryEntry } from "@/lib/merlin/types";
import { pulseMerlinState } from "@/lib/merlin/state";

/**
 * Parte 4 — Memoria de aprendizaje.
 * Todo lo que Merlin cree saber del alumno, con su nivel de confianza,
 * su evidencia de origen y la posibilidad de corregirlo.
 */

type Group = {
  key: MemoryEntry["type"] | "decisiones";
  label: string;
  hint: string;
};

const GROUPS: Group[] = [
  { key: "conocimiento", label: "Conocimientos", hint: "Lo que ya está consolidado con evidencia repetida" },
  { key: "error_recurrente", label: "Errores recurrentes", hint: "Patrones de fallo que reaparecen en el tiempo" },
  { key: "estrategia_exitosa", label: "Estrategias exitosas", hint: "Formas de enseñar que sí producen avance" },
  { key: "estrategia_descartada", label: "Estrategias descartadas", hint: "Vías abandonadas por baja efectividad" },
  { key: "conclusion", label: "Conclusiones", hint: "Hipótesis sobre cómo aprende, siempre revisables" },
  { key: "evolucion", label: "Evolución", hint: "Cómo cambia el modelo del alumno con el tiempo" },
  { key: "decisiones", label: "Decisiones auditables", hint: "Cada cambio con motivo, evidencia y resultado esperado" },
];

export function LearningMemory() {
  const [active, setActive] = useState<Group["key"]>("conocimiento");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [revised, setRevised] = useState<string[]>([]);

  const entries = MERLIN_DATA.memory.filter((m) => !dismissed.includes(m.id));

  const counts = useMemo(() => {
    const c: Record<string, number> = { decisiones: MERLIN_DATA.decisions.length };
    for (const m of entries) c[m.type] = (c[m.type] ?? 0) + 1;
    return c;
  }, [entries]);

  const avgConfidence = Math.round(
    entries.reduce((a, m) => a + m.confidence, 0) / Math.max(entries.length, 1),
  );
  const solid = entries.filter((m) => meetsThreshold(m.confidence, m.importance)).length;

  const list = entries.filter((m) => m.type === active);

  const revise = (id: string) => {
    setRevised((r) => (r.includes(id) ? r : [...r, id]));
    pulseMerlinState("aprendiendo", 2000);
  };

  return (
    <section className="w-full max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Memoria de aprendizaje</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide">Lo que Merlin sabe de ti</h2>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Confianza media</p>
            <p className="font-display text-2xl glow-text">{avgConfidence}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Sobre umbral</p>
            <p className="font-display text-2xl text-foreground">
              {solid}/{entries.length}
            </p>
          </div>
        </div>
      </header>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Nada aquí es definitivo. Cada afirmación nace de evidencia concreta, lleva su nivel de confianza y puede
        corregirse: si la marcas como incorrecta, Merlin deja de usarla para decidir tu ruta.
      </p>

      {/* Navegación por tipo de memoria */}
      <div className="mt-6 flex flex-wrap gap-1">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setActive(g.key)}
            className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-all ${
              active === g.key
                ? "bg-primary/15 text-primary shadow-[0_0_20px_-6px_var(--glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.label}
            <span className="ml-2 opacity-60">{counts[g.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground/80">
        {GROUPS.find((g) => g.key === active)?.hint}
      </p>

      {active === "decisiones" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {MERLIN_DATA.decisions.map((d) => (
            <article key={d.id} className="merlin-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-foreground/90">{d.title}</p>
                <span className="rounded-full border border-primary/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {d.outcome}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <Row k="Motivo" v={d.motive} />
                <Row k="Evidencia" v={d.evidence} />
                <Row k="Acción" v={d.action} />
                <Row k="Resultado esperado" v={d.expected} />
              </dl>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{d.date}</span>
                <span>
                  Confianza {d.confidence}% ·{" "}
                  {meetsThreshold(d.confidence, "alta") ? "supera el umbral" : "en observación"}
                </span>
              </div>
              <div className="ku-bar mt-2">
                <i style={{ width: `${d.confidence}%` }} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {list.length === 0 && (
            <p className="merlin-panel p-6 text-sm text-muted-foreground">
              Todavía no hay entradas de este tipo con evidencia suficiente.
            </p>
          )}
          {list.map((m) => {
            const ok = meetsThreshold(m.confidence, m.importance);
            return (
              <article key={m.id} className="merlin-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-foreground/90">{m.content}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                      ok ? "border border-primary/30 text-primary" : "border border-muted-foreground/25 text-muted-foreground"
                    }`}
                  >
                    {ok ? "en uso" : "observando"}
                  </span>
                </div>
                <div className="ku-bar mt-3">
                  <i style={{ width: `${m.confidence}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Confianza {m.confidence}% · importancia {m.importance}
                  </span>
                  <span>Actualizado {m.lastUpdated}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => revise(m.id)}
                    disabled={revised.includes(m.id)}
                    className="rounded-full border border-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                  >
                    {revised.includes(m.id) ? "Confirmado" : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setDismissed((d) => [...d, m.id])}
                    className="rounded-full border border-muted-foreground/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    No es correcto
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Evidencia de origen */}
      <div className="merlin-panel mt-6 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Evidencia de origen</p>
            <p className="mt-2 text-xs text-muted-foreground/80">
              Cada afirmación de la memoria proviene de hechos observados, no de suposiciones.
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {MERLIN_DATA.evidence.length} registros
          </span>
        </div>
        <ul className="mt-4 space-y-2">
          {[...MERLIN_DATA.evidence]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 6)
            .map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-l border-primary/20 pl-3">
                <span className="text-xs text-foreground/85">
                  {conceptById(e.conceptId)?.name} · {e.context}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {e.type} · {e.result} · {e.confidence}% · {e.date}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-foreground/70">{k}:</dt>
      <dd>{v}</dd>
    </div>
  );
}
