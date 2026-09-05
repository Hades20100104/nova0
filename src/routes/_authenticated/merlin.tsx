import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MerlinCore } from "@/components/merlin/MerlinCore";
import { KnowledgeUniverse } from "@/components/merlin/KnowledgeUniverse";
import { AdaptiveRoute } from "@/components/merlin/AdaptiveRoute";
import { LearningMemory } from "@/components/merlin/LearningMemory";
import { ProgressPanel } from "@/components/merlin/ProgressPanel";
import { LearningAnalysis } from "@/components/merlin/LearningAnalysis";
import { LearnMode } from "@/components/merlin/LearnMode";
import { CONTEXT_MENU, useMerlinState, type MerlinView } from "@/lib/merlin/state";
import { MERLIN_DATA, conceptById, globalProgress, nextStep } from "@/lib/merlin/mock";
import { MODE_LABEL } from "@/lib/merlin/types";

export const Route = createFileRoute("/_authenticated/merlin")({
  head: () => ({
    meta: [
      { title: "MERLIN — Sistema cognitivo de aprendizaje" },
      {
        name: "description",
        content:
          "Merlin construye un modelo de cómo aprendes: mapa de conocimiento vivo, ruta adaptativa y memoria de aprendizaje con niveles de confianza.",
      },
      { property: "og:title", content: "MERLIN — Sistema cognitivo de aprendizaje" },
      {
        property: "og:description",
        content: "No es una plataforma escolar: es un sistema que descubre cómo aprendes y adapta la ruta contigo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://nova0.lovable.app/merlin" }],
  }),
  component: MerlinPage,
});

function MerlinPage() {
  const { state, pulse } = useMerlinState();
  const [view, setView] = useState<MerlinView>("nucleo");
  const [prompt, setPrompt] = useState("");

  const step = nextStep();
  const stepConcept = conceptById(step.conceptId);
  const progress = globalProgress();

  const ask = () => {
    if (!prompt.trim()) return;
    pulse("investigando", 2200);
    setTimeout(() => pulse("ensenando", 2600), 2200);
  };

  return (
    <div className="merlin-bg theme-merlin min-h-screen w-full text-foreground">
      <h1 className="sr-only">Merlin, sistema cognitivo de aprendizaje personalizado</h1>

      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rotate-45 bg-primary shadow-[0_0_14px_var(--glow)]" />
          <span className="font-display text-lg tracking-[0.42em] glow-text">MERLIN</span>
        </div>
        <nav className="flex items-center gap-5 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          <Link to="/nova" className="hover:text-primary transition-colors">
            Nova
          </Link>
          <Link to="/nevira" className="hover:text-primary transition-colors">
            Nevira
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-28 pt-6">
        {view === "nucleo" ? (
          <>
            <MerlinCore state={state} size={320} />

            <p className="mt-10 text-center font-display text-2xl tracking-wide text-foreground/90">
              ¿Qué quieres aprender hoy?
            </p>

            <div className="merlin-panel mt-6 flex w-full max-w-2xl items-center gap-3 px-5 py-3">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Explícame los límites… o pídeme que evalúe lo que ya sabes"
                aria-label="Pregunta a Merlin"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={ask}
                className="rounded-full border border-primary/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.24em] text-primary transition-colors hover:bg-primary/10"
              >
                Iniciar
              </button>
            </div>

            <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Indicator label="Ruta actual" value={MERLIN_DATA.subject.name} sub={`Prioridad ${MERLIN_DATA.route.priority}`} />
              <Indicator label="Progreso" value={`${progress}%`} sub={`${MERLIN_DATA.personal.filter((p) => p.status === "dominado").length} conceptos dominados`} />
              <Indicator
                label="Siguiente paso"
                value={stepConcept?.name ?? "—"}
                sub={`${MODE_LABEL[step.mode]} · ${step.minutes} min`}
                onClick={() => {
                  setLearnConcept(step.conceptId);
                  setView("aprender");
                }}
              />
            </div>
          </>
        ) : view === "aprender" ? (
          <LearnMode initialConceptId={learnConcept} />
        ) : view === "mapa" ? (
          <KnowledgeUniverse />
        ) : view === "ruta" ? (
          <AdaptiveRoute />
        ) : view === "memoria" ? (
          <LearningMemory />
        ) : view === "progreso" ? (
          <ProgressPanel />
        ) : view === "analisis" ? (
          <LearningAnalysis />
        ) : (
          <section className="merlin-panel w-full max-w-3xl p-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80">{view}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Esta capa se construye en la siguiente fase: ruta adaptativa, memoria y análisis.
            </p>
          </section>
        )}
      </main>


      {/* Menú contextual: solo lo relevante en este momento */}
      <nav className="fixed inset-x-0 bottom-6 flex justify-center px-6">
        <div className="merlin-panel flex flex-wrap items-center justify-center gap-1 px-2 py-2">
          <MenuItem active={view === "nucleo"} onClick={() => setView("nucleo")} label="Núcleo" />
          {CONTEXT_MENU.inicio.map((m) => (
            <MenuItem key={m.label} active={view === m.view} onClick={() => setView(m.view)} label={m.label} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function Indicator({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="merlin-panel px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-lg text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MenuItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] transition-all ${
        active ? "bg-primary/15 text-primary shadow-[0_0_20px_-6px_var(--glow)]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
