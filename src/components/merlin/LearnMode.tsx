import { useMemo, useState } from "react";
import {
  lessonConceptIds,
  lessonContext,
  lessonFor,
  routeStepsFor,
  suggestedLessonConcept,
} from "@/lib/merlin/lessons";
import { conceptById } from "@/lib/merlin/mock";
import { MODE_LABEL, STATUS_LABEL } from "@/lib/merlin/types";
import { pulseMerlinState } from "@/lib/merlin/state";

/**
 * Modo Aprender — explicación guiada paso a paso, ejemplos trabajados
 * y ejercicios que producen evidencia. Conectado al mapa (prerrequisitos y
 * conceptos que desbloquea) y a la ruta adaptativa.
 */
export function LearnMode({ initialConceptId }: { initialConceptId?: string }) {
  const [conceptId, setConceptId] = useState(initialConceptId ?? suggestedLessonConcept());
  const [stepIndex, setStepIndex] = useState(0);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const lesson = lessonFor(conceptId);
  const ctx = useMemo(() => lessonContext(conceptId), [conceptId]);
  const routeSteps = useMemo(() => routeStepsFor(conceptId), [conceptId]);

  const select = (id: string) => {
    setConceptId(id);
    setStepIndex(0);
    setOpenDetail(null);
    setAnswers({});
    pulseMerlinState("ensenando", 2200);
  };

  if (!lesson) {
    return (
      <section className="merlin-panel w-full max-w-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">Aún no hay lección construida para este concepto.</p>
      </section>
    );
  }

  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex];
  const answered = lesson.exercises.filter((e) => answers[e.id] !== undefined);
  const correct = answered.filter((e) => answers[e.id] === e.answer);

  const answer = (exerciseId: string, option: number, ok: boolean) => {
    if (answers[exerciseId] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [exerciseId]: option }));
    pulseMerlinState(ok ? "aprendiendo" : "evaluando", 2200);
  };

  return (
    <section className="w-full max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Modo aprender</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide">{ctx.concept?.name ?? conceptId}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{ctx.concept?.curriculumUnit}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {lessonConceptIds.map((id) => (
            <button
              key={id}
              onClick={() => select(id)}
              className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-all ${
                id === conceptId
                  ? "bg-primary/15 text-primary shadow-[0_0_20px_-6px_var(--glow)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {conceptById(id)?.name ?? id}
            </button>
          ))}
        </div>
      </header>

      {/* Objetivo y por qué se enseña así */}
      <div className="merlin-panel mt-5 grid gap-6 p-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Objetivo de esta sesión</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">{lesson.goal}</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Por qué así</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lesson.approach}</p>
          {ctx.strategy && (
            <p className="mt-3 text-xs text-primary/80">
              Estrategia activa: {ctx.strategy.type} · efectividad {ctx.strategy.effectiveness}%
            </p>
          )}
        </div>
        <div className="space-y-3">
          {ctx.personal && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Tu dominio actual</p>
              <p className="mt-2 font-display text-2xl text-foreground">{ctx.personal.overall}%</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[ctx.personal.status]}</p>
            </div>
          )}
          {routeSteps.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">En tu ruta</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {routeSteps.map((s) => (
                  <li key={s.id}>
                    {s.label} · {MODE_LABEL[s.mode]} · {s.minutes} min
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Paso guiado */}
      <div className="merlin-panel mt-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
            {step.kind} · paso {stepIndex + 1} de {total}
          </p>
          <div className="ml-progress" aria-hidden>
            <span style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
          </div>
        </div>

        <h3 className="mt-4 font-display text-xl tracking-wide">{step.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{step.body}</p>

        {step.detail && (
          <div className="mt-4">
            <button
              onClick={() => setOpenDetail(openDetail === step.id ? null : step.id)}
              className="rounded-full border border-primary/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/10"
            >
              {openDetail === step.id ? "Ocultar desarrollo" : "Ver desarrollo"}
            </button>
            {openDetail === step.id && (
              <pre className="ml-detail mt-3">{step.detail}</pre>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            Anterior
          </button>
          <div className="flex gap-1.5">
            {lesson.steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStepIndex(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={`h-1.5 w-6 rounded-full transition-all ${i <= stepIndex ? "bg-primary" : "bg-foreground/15"}`}
              />
            ))}
          </div>
          <button
            onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
            disabled={stepIndex === total - 1}
            className="rounded-full border border-primary/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Ejercicios con evidencia */}
      <div className="merlin-panel mt-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Ejercicios · generan evidencia</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {correct.length}/{lesson.exercises.length} correctos
          </p>
        </div>

        <div className="mt-5 space-y-5">
          {lesson.exercises.map((ex) => {
            const given = answers[ex.id];
            const done = given !== undefined;
            const ok = given === ex.answer;
            return (
              <article key={ex.id} className="ml-exercise">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/70">{ex.dimension}</p>
                <p className="mt-2 text-sm text-foreground/90">{ex.prompt}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {ex.options.map((opt, i) => {
                    const isAnswer = i === ex.answer;
                    const isGiven = i === given;
                    return (
                      <button
                        key={opt}
                        onClick={() => answer(ex.id, i, isAnswer)}
                        disabled={done}
                        className={`ml-option ${
                          done && isAnswer ? "ml-option--ok" : done && isGiven ? "ml-option--bad" : ""
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {done && (
                  <p className={`mt-3 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}>
                    {ok ? ex.feedbackOk : ex.feedbackFail}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {answered.length === lesson.exercises.length && (
          <p className="mt-5 text-xs text-muted-foreground">
            Merlin registró esta evidencia y ajustará tu dominio de {ctx.concept?.name} en la próxima
            reevaluación de ruta.
          </p>
        )}
      </div>

      {/* Conexión con el mapa */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Se apoya en</p>
          <ul className="mt-3 space-y-2 text-sm">
            {ctx.prerequisites.length === 0 && <li className="text-muted-foreground">Sin prerrequisitos.</li>}
            {ctx.prerequisites.map((p) => (
              <li key={p.concept?.id} className="flex items-center justify-between gap-3">
                <span className="text-foreground/85">{p.concept?.name}</span>
                <span className="text-xs text-muted-foreground">{p.personal ? `${p.personal.overall}%` : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="merlin-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Desbloquea</p>
          <ul className="mt-3 space-y-2 text-sm">
            {ctx.unlocks.length === 0 && <li className="text-muted-foreground">Nodo terminal por ahora.</li>}
            {ctx.unlocks.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span className="text-foreground/85">{c.name}</span>
                <button
                  onClick={() => lessonFor(c.id) && select(c.id)}
                  disabled={!lessonFor(c.id)}
                  className="text-[10px] uppercase tracking-[0.22em] text-primary transition-opacity disabled:opacity-30"
                >
                  {lessonFor(c.id) ? "Aprender" : "Sin lección"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
