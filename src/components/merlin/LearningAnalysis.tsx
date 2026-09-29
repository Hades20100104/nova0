import { useMemo } from "react";
import { MERLIN_DATA, conceptById } from "@/lib/merlin/mock";
import { meetsThreshold, type Mastery } from "@/lib/merlin/types";

const DIMENSIONS: { key: keyof Mastery; label: string }[] = [
  { key: "comprension", label: "Comprensión" },
  { key: "aplicacion", label: "Aplicación" },
  { key: "transferencia", label: "Transferencia" },
  { key: "retencion", label: "Retención" },
  { key: "teoria", label: "Teoría" },
  { key: "practica", label: "Práctica" },
];

/**
 * Parte 5 — Análisis.
 * Merlin no reporta notas: expone cómo aprende el alumno, dónde se rompe
 * el aprendizaje y qué hipótesis está probando ahora mismo.
 */
export function LearningAnalysis() {
  const dims = useMemo(() => {
    const n = MERLIN_DATA.personal.length;
    return DIMENSIONS.map((d) => ({
      ...d,
      value: Math.round(MERLIN_DATA.personal.reduce((a, p) => a + p.mastery[d.key], 0) / n),
    }));
  }, []);

  const gap = useMemo(() => {
    const c = dims.find((d) => d.key === "comprension")?.value ?? 0;
    const a = dims.find((d) => d.key === "aplicacion")?.value ?? 0;
    return c - a;
  }, [dims]);

  const evidenceQuality = useMemo(() => {
    const e = MERLIN_DATA.evidence;
    const ok = e.filter((x) => x.result === "correcto").length;
    const partial = e.filter((x) => x.result === "parcial").length;
    const bad = e.length - ok - partial;
    const avgConf = Math.round(e.reduce((a, x) => a + x.confidence, 0) / e.length);
    return { total: e.length, ok, partial, bad, avgConf };
  }, []);

  const strategies = useMemo(
    () => [...MERLIN_DATA.strategies].sort((a, b) => b.effectiveness - a.effectiveness),
    [],
  );

  const bottleneck = useMemo(
    () => [...MERLIN_DATA.personal].sort((a, b) => a.overall - b.overall)[0],
    [],
  );

  return (
    <section className="w-full max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Análisis</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide">Cómo aprendes</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Brecha comprensión–aplicación</p>
          <p className="font-display text-3xl glow-text">{gap > 0 ? `+${gap}` : gap}</p>
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Perfil multidimensional</p>
          <ul className="mt-4 space-y-3">
            {dims.map((d) => (
              <li key={d.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/85">{d.label}</span>
                  <span className="text-muted-foreground">{d.value}%</span>
                </div>
                <div className="ku-bar mt-2">
                  <i style={{ width: `${d.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Tu comprensión va por delante de tu aplicación de forma sostenida. Merlin interpreta esto como un patrón
            de aprendizaje conceptual‑primero: entiendes la idea antes de poder usarla, así que la práctica contextual
            rinde más que la repetición formal.
          </p>
        </div>

        <div className="space-y-6">
          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Calidad de la evidencia</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Registros" value={`${evidenceQuality.total}`} />
              <Stat label="Confianza media" value={`${evidenceQuality.avgConf}%`} />
              <Stat label="Correctos" value={`${evidenceQuality.ok}`} />
              <Stat label="Parciales / fallos" value={`${evidenceQuality.partial} / ${evidenceQuality.bad}`} />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              {meetsThreshold(evidenceQuality.avgConf, "alta")
                ? "La evidencia es suficiente para sostener decisiones importantes."
                : "La evidencia aún no supera el umbral alto: Merlin observa antes de cambiar la ruta."}
            </p>
          </div>

          <div className="merlin-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Punto de ruptura</p>
            <p className="mt-3 text-sm text-foreground/90">{conceptById(bottleneck.conceptId)?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dominio {bottleneck.overall}% · aplicación {bottleneck.mastery.aplicacion}% · transferencia{" "}
              {bottleneck.mastery.transferencia}%
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Todo el avance hacia derivadas depende de este nodo; por eso concentra la prioridad de la ruta actual.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Efectividad de estrategias</p>
          <ul className="mt-4 space-y-3">
            {strategies.map((s) => (
              <li key={s.id}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground/85">{s.type}</span>
                  <span className="text-muted-foreground">{s.effectiveness}%</span>
                </div>
                <div className="ku-bar mt-2">
                  <i style={{ width: `${s.effectiveness}%` }} />
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {s.result} · {s.context}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Hipótesis en prueba</p>
          <ul className="mt-4 space-y-4">
            {MERLIN_DATA.decisions.map((d) => (
              <li key={d.id} className="border-l border-primary/20 pl-3">
                <p className="text-sm text-foreground/90">{d.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.expected}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  Confianza {d.confidence}% · estado {d.outcome}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Cada hipótesis se conserva o se revierte según la evidencia posterior; ninguna conclusión es definitiva.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary/15 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg text-foreground">{value}</p>
    </div>
  );
}
