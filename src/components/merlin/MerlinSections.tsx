import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  teach, generatePractice, evaluateAnswer, diagnosticNext, diagnosticFinish,
  buildExam, writingCenter, research, runLab, askLibrary,
} from "@/lib/merlin.functions";
import {
  useSubjects, useSubjectMutations, useSubjectMap, useConcept, useMerlinOverview,
  useMerlinDocuments, useDocMutations, useRouteMutations, useMerlinTracking,
} from "@/lib/merlin-data";
import { KnowledgeMap } from "./KnowledgeMap";
import { DIMENSIONS, LEARN_MODES, PRACTICE_KINDS, STATUS_META, CONFIDENCE_THRESHOLD, MERLIN_AGENTS } from "@/lib/merlin";
import { Loader2, Plus, Sparkles, Send, Trash2, Timer, BookOpen, Check, X } from "lucide-react";

/* ── UI helpers ── */

export function Card({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`liquid-glass rounded-2xl border border-primary/25 p-4 md:p-5 ${className}`}>
      {title && (
        <header className="mb-3">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase glow-text">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground/80">{Math.round(value)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Orb({ label, value }: { label: string; value: number }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="9" />
          <circle
            cx="56" cy="56" r={r} fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100}
            transform="rotate(-90 56 56)" className="drop-shadow-[0_0_10px_var(--glow)]"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-xl glow-text">{Math.round(value)}%</span>
      </div>
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
    </div>
  );
}

function Btn({ children, onClick, busy, variant = "solid", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: "solid" | "ghost" }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
        variant === "solid" ? "border border-primary/50 bg-primary/15 hover:bg-primary/25" : "border border-border/40 hover:bg-foreground/5"
      } ${className}`}
      {...rest}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

const inputCls = "w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/60";

function Prose({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{text}</div>;
}

function ConfidenceChip({ value, importance = "media" }: { value: number; importance?: "baja" | "media" | "alta" }) {
  const th = CONFIDENCE_THRESHOLD[importance];
  const ok = value >= th;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${ok ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"}`}>
      confianza {Math.round(value)}% · umbral {th}%
    </span>
  );
}

/* ── Selector de materia ── */

function SubjectPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { data } = useSubjects();
  const { create, remove } = useSubjectMutations();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const subjects = data?.subjects ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {subjects.map((s) => (
        <span key={s.id} className="group inline-flex items-center gap-1">
          <button
            onClick={() => onChange(s.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${value === s.id ? "border-primary bg-primary/20" : "border-border/50 hover:bg-foreground/5"}`}
          >
            {s.name}
          </button>
          <button
            onClick={() => confirm(`¿Eliminar ${s.name}?`) && remove.mutate(s.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
            aria-label={`Eliminar ${s.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input className={`${inputCls} w-40 py-1.5`} placeholder="Nueva materia" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inputCls} w-32 py-1.5`} placeholder="Nivel" value={level} onChange={(e) => setLevel(e.target.value)} />
        <Btn
          busy={create.isPending}
          onClick={() =>
            name.trim() &&
            create.mutate({ name: name.trim(), level: level.trim() || "general" }, { onSuccess: (r) => { setName(""); onChange(r.subject.id); } })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Crear mapa
        </Btn>
      </div>
    </div>
  );
}

/* ── Secciones ── */

function Inicio({ onOpen }: { onOpen: (slug: string) => void }) {
  const { data } = useMerlinOverview();
  const { answerRecall } = useMerlinTracking();
  const concepts = data?.concepts ?? [];
  const dominio = concepts.length ? concepts.reduce((a, c) => a + Number(c.overall), 0) / concepts.length : 0;
  const confianza = concepts.length ? concepts.reduce((a, c) => a + Number(c.confidence), 0) / concepts.length : 0;
  const razonamiento = concepts.length
    ? concepts.reduce((a, c) => a + (((c.mastery as Record<string, number>)?.transferencia ?? 0) + ((c.mastery as Record<string, number>)?.aplicacion ?? 0)) / 2, 0) / concepts.length
    : 0;

  return (
    <div className="space-y-4">
      <Card title="Estado del aprendizaje" subtitle="Todo lo que ves son inferencias con evidencia, no etiquetas fijas.">
        <div className="grid grid-cols-3 gap-2">
          <Orb label="Razonamiento" value={razonamiento} />
          <Orb label="Dominio" value={dominio} />
          <Orb label="Confianza" value={confianza} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Repasos programados" subtitle="Recuperación espaciada activa">
          {(data?.recalls ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin repasos pendientes.</p>}
          <div className="space-y-2">
            {(data?.recalls ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 p-2 text-sm">
                <span className="truncate">{r.question ?? "Repaso"}</span>
                <span className="flex gap-1">
                  <button onClick={() => answerRecall.mutate({ id: r.id, result: "ok" })} className="rounded border border-emerald-400/40 p-1 text-emerald-300" aria-label="Recordado"><Check className="h-3 w-3" /></button>
                  <button onClick={() => answerRecall.mutate({ id: r.id, result: "fallo" })} className="rounded border border-red-400/40 p-1 text-red-300" aria-label="Olvidado"><X className="h-3 w-3" /></button>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Conceptos que piden atención">
          <div className="space-y-2">
            {concepts
              .slice()
              .sort((a, b) => Number(a.overall) - Number(b.overall))
              .slice(0, 6)
              .map((c) => (
                <button key={c.id} onClick={() => onOpen("mapa")} className="w-full text-left">
                  <Bar label={c.name} value={Number(c.overall)} />
                </button>
              ))}
            {concepts.length === 0 && <p className="text-xs text-muted-foreground">Crea una materia en el Mapa del conocimiento para empezar.</p>}
          </div>
        </Card>
      </div>

      <Card title="Actividad reciente">
        <div className="space-y-2">
          {(data?.evidence ?? []).slice(0, 6).map((e, i) => (
            <div key={i} className="rounded-lg border border-border/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-primary/80">{e.agent}</span>
                <ConfidenceChip value={Number(e.confidence)} importance={(e.importance as "baja" | "media" | "alta") ?? "media"} />
              </div>
              <p className="mt-1 text-sm text-foreground/85">{e.summary}</p>
              {e.hypothesis && <p className="text-xs text-muted-foreground">Hipótesis: {e.hypothesis}</p>}
            </div>
          ))}
          {(data?.evidence ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aún no hay evidencia registrada.</p>}
        </div>
      </Card>
    </div>
  );
}

function Mapa({ subjectId, setSubjectId }: { subjectId?: string; setSubjectId: (id: string) => void }) {
  const { data, isFetching } = useSubjectMap(subjectId);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useConcept(selected ?? undefined);
  const concept = detail.data?.concept;
  const mastery = (concept?.mastery ?? {}) as Record<string, number>;

  return (
    <div className="space-y-4">
      <Card title="Mapa del conocimiento" subtitle="Cada nodo es un concepto vivo: dominio, confianza y relaciones.">
        <SubjectPicker value={subjectId} onChange={setSubjectId} />
      </Card>
      {isFetching && <p className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> Construyendo mapa…</p>}
      {subjectId && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <KnowledgeMap
            concepts={(data?.concepts ?? []).map((c) => ({
              id: c.id, name: c.name, area: c.area, overall: Number(c.overall), confidence: Number(c.confidence), status: c.status,
            }))}
            relations={data?.relations ?? []}
            selected={selected}
            onSelect={setSelected}
          />
          <Card title={concept?.name ?? "Concepto"} subtitle={concept ? STATUS_META[concept.status]?.label : "Selecciona un nodo"}>
            {concept ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{concept.summary}</p>
                <div className="space-y-2">
                  {DIMENSIONS.filter((d) => d.id in mastery).map((d) => (
                    <Bar key={d.id} label={d.label} value={mastery[d.id] ?? 0} />
                  ))}
                </div>
                <ConfidenceChip value={Number(concept.confidence)} importance="alta" />
                <div>
                  <div className="sidebar-section-label px-0">Evidencia</div>
                  <div className="space-y-1">
                    {(detail.data?.evidence ?? []).slice(0, 5).map((e) => (
                      <p key={e.id} className="text-xs text-foreground/80">• {e.summary}</p>
                    ))}
                    {(detail.data?.evidence ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin evidencia todavía.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Toca un nodo del mapa para ver su estado real.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Profesor({ subjectId }: { subjectId?: string }) {
  const teachFn = useServerFn(teach);
  const evalFn = useServerFn(evaluateAnswer);
  const { data: map } = useSubjectMap(subjectId);
  const [conceptId, setConceptId] = useState<string>("");
  const [mode, setMode] = useState("aprender");
  const [difficulty, setDifficulty] = useState(3);
  const [request, setRequest] = useState("");
  const [out, setOut] = useState("");
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof evalFn>> | null>(null);
  const [busy, setBusy] = useState<"teach" | "eval" | null>(null);

  const run = async () => {
    setBusy("teach"); setAnalysis(null);
    try {
      const r = await teachFn({ data: { conceptId: conceptId || undefined, subjectId, mode, difficulty, request } });
      setOut(r.text);
    } finally { setBusy(null); }
  };
  const check = async () => {
    setBusy("eval");
    try {
      const r = await evalFn({ data: { conceptId: conceptId || undefined, subjectId, question: out.slice(0, 1500), answer, importance: "alta" } });
      setAnalysis(r);
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Card title="Profesor personal" subtitle="Enseña adaptando la estrategia a la evidencia, no al promedio.">
        <div className="grid gap-3 md:grid-cols-2">
          <select className={inputCls} value={conceptId} onChange={(e) => setConceptId(e.target.value)}>
            <option value="">Tema libre</option>
            {(map?.concepts ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.overall}%</option>)}
          </select>
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            {LEARN_MODES.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.blurb}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Dificultad</span>
          <input type="range" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
          <span className="text-xs">{difficulty}/5</span>
        </div>
        <textarea className={`${inputCls} mt-3 min-h-[80px]`} placeholder="¿Qué quieres aprender o resolver?" value={request} onChange={(e) => setRequest(e.target.value)} />
        <Btn className="mt-3" busy={busy === "teach"} onClick={run}><Sparkles className="h-3.5 w-3.5" /> Enseñar</Btn>
      </Card>

      {out && (
        <Card title="Clase">
          <Prose text={out} />
          <div className="mt-4 space-y-2">
            <textarea className={`${inputCls} min-h-[80px]`} placeholder="Responde las preguntas de comprobación…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <Btn busy={busy === "eval"} onClick={check}><Send className="h-3.5 w-3.5" /> Enviar evidencia</Btn>
          </div>
        </Card>
      )}

      {analysis && (
        <Card title="Análisis de los agentes" subtitle={analysis.actionable ? "Evidencia suficiente: el mapa se actualizó." : `Confianza bajo el umbral (${analysis.threshold}%): no se modifica el mapa.`}>
          <Prose text={analysis.analysis.feedback} />
          <div className="mt-3 space-y-2">
            {analysis.analysis.agents?.map((a, i) => (
              <div key={i} className="rounded-lg border border-border/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-primary/80">
                    {MERLIN_AGENTS.find((x) => x.id === a.agent)?.name ?? a.agent}
                  </span>
                  <ConfidenceChip value={a.confidence} importance="alta" />
                </div>
                <p className="mt-1 text-sm">{a.observation}</p>
                <p className="text-xs text-muted-foreground">Posiblemente: {a.hypothesis}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-primary/90">Siguiente paso: {analysis.analysis.next}</p>
        </Card>
      )}
    </div>
  );
}

function Diagnostico({ subjectId }: { subjectId?: string }) {
  const nextFn = useServerFn(diagnosticNext);
  const finishFn = useServerFn(diagnosticFinish);
  const [history, setHistory] = useState<{ question: string; answer: string; concept?: string }[]>([]);
  const [current, setCurrent] = useState<{ question: string; concept: string; difficulty: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof finishFn>> | null>(null);

  const start = async () => {
    if (!subjectId) return;
    setBusy(true); setResult(null); setHistory([]);
    try {
      const r = await nextFn({ data: { subjectId, history: [] } });
      setCurrent(r.question);
    } finally { setBusy(false); }
  };
  const send = async () => {
    if (!subjectId || !current) return;
    const h = [...history, { question: current.question, answer, concept: current.concept }];
    setHistory(h); setAnswer(""); setBusy(true);
    try {
      const r = await nextFn({ data: { subjectId, history: h } });
      if (r.done || !r.question) {
        setCurrent(null);
        setResult(await finishFn({ data: { subjectId, history: h } }));
      } else setCurrent(r.question);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card title="Diagnóstico adaptativo" subtitle="No mide aciertos: mide habilidades, y sube o baja según tus respuestas.">
        {!subjectId && <p className="text-xs text-muted-foreground">Elige una materia en el Mapa primero.</p>}
        <Btn busy={busy && !current} onClick={start} disabled={!subjectId}>Iniciar diagnóstico</Btn>
      </Card>
      {current && (
        <Card title={`Pregunta ${history.length + 1}/8`} subtitle={`${current.concept} · dificultad ${current.difficulty}/5`}>
          <Prose text={current.question} />
          <textarea className={`${inputCls} mt-3 min-h-[90px]`} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tu respuesta" />
          <Btn className="mt-2" busy={busy} onClick={send}><Send className="h-3.5 w-3.5" /> Responder</Btn>
        </Card>
      )}
      {result && (
        <Card title="Perfil detectado" subtitle="Interpretación con confianza explícita">
          <div className="space-y-2">
            {result.result.profile?.map((p, i) => <Bar key={i} label={p.dimension} value={p.value} />)}
          </div>
          <p className="mt-3 text-sm">{result.result.note}</p>
          <p className="mt-2 text-xs text-muted-foreground">Vacíos: {(result.result.gaps ?? []).join(", ") || "ninguno detectado"}</p>
          <div className="mt-2"><ConfidenceChip value={result.result.confidence} importance="alta" /></div>
        </Card>
      )}
    </div>
  );
}

function Ruta({ subjectId }: { subjectId?: string }) {
  const { data } = useSubjectMap(subjectId);
  const { plan } = useRouteMutations();
  const [goal, setGoal] = useState("");
  const steps = ((plan.data?.plan.steps ?? (data?.route?.steps as unknown as { title: string; mode: string; minutes: number; why: string }[])) ?? []) as { title: string; mode: string; minutes: number; why: string }[];

  return (
    <div className="space-y-4">
      <Card title="Ruta adaptativa" subtitle="Si funciona, no se toca. Solo se reconstruye con evidencia de que dejó de funcionar.">
        <div className="flex flex-wrap gap-2">
          <input className={`${inputCls} flex-1 min-w-[220px]`} placeholder="Objetivo (ej. aprobar el examen del viernes)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <Btn busy={plan.isPending} disabled={!subjectId} onClick={() => subjectId && plan.mutate({ subjectId, goal })}>Recalcular ruta</Btn>
        </div>
        {(plan.data?.plan.reason || data?.route?.reason) && (
          <p className="mt-3 text-xs text-muted-foreground">Por qué: {plan.data?.plan.reason ?? data?.route?.reason}</p>
        )}
      </Card>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="liquid-glass flex items-start gap-3 rounded-xl border border-primary/20 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/40 text-xs">{i + 1}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium">{s.title}</div>
              <div className="text-[11px] uppercase tracking-widest text-primary/70">{s.mode} · {s.minutes} min</div>
              <p className="text-xs text-muted-foreground">{s.why}</p>
            </div>
          </div>
        ))}
        {steps.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay ruta. Genera una arriba.</p>}
      </div>
    </div>
  );
}

function Practica({ subjectId }: { subjectId?: string }) {
  const genFn = useServerFn(generatePractice);
  const evalFn = useServerFn(evaluateAnswer);
  const { data: map } = useSubjectMap(subjectId);
  const [conceptId, setConceptId] = useState("");
  const [kind, setKind] = useState<string>("guiada");
  const [items, setItems] = useState<{ prompt: string; hint: string; expects: string; difficulty: number }[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <Card title="Práctica con propósito" subtitle="Cada ejercicio ataca una necesidad detectada, no relleno.">
        <div className="grid gap-3 md:grid-cols-3">
          <select className={inputCls} value={conceptId} onChange={(e) => setConceptId(e.target.value)}>
            <option value="">Tema libre</option>
            {(map?.concepts ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            {PRACTICE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <Btn
            busy={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await genFn({ data: { conceptId: conceptId || undefined, kind, count: 4 } });
                setItems(r.items ?? []); setAnswers({}); setFeedback({});
              } finally { setBusy(false); }
            }}
          >
            Generar práctica
          </Btn>
        </div>
      </Card>
      {items.map((it, i) => (
        <Card key={i} title={`Ejercicio ${i + 1}`} subtitle={`Dificultad ${it.difficulty}/5`}>
          <Prose text={it.prompt} />
          <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Pista</summary>{it.hint}</details>
          <textarea className={`${inputCls} mt-2 min-h-[70px]`} value={answers[i] ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} placeholder="Tu respuesta" />
          <Btn
            className="mt-2"
            onClick={async () => {
              const r = await evalFn({ data: { conceptId: conceptId || undefined, subjectId, question: it.prompt, answer: answers[i] ?? "", importance: "media", strategy: kind } });
              setFeedback({ ...feedback, [i]: `${r.analysis.feedback}\n\nSiguiente: ${r.analysis.next}` });
            }}
          >
            Revisar
          </Btn>
          {feedback[i] && <div className="mt-2 rounded-lg border border-primary/25 p-2"><Prose text={feedback[i]} /></div>}
        </Card>
      ))}
    </div>
  );
}

function Examenes({ subjectId }: { subjectId?: string }) {
  const fn = useServerFn(buildExam);
  const [exam, setExam] = useState<Awaited<ReturnType<typeof fn>> | null>(null);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [topic, setTopic] = useState("");
  const score = exam ? exam.questions.filter((q, i) => picks[i] === q.answer).length : 0;

  return (
    <div className="space-y-4">
      <Card title="Preparación de exámenes" subtitle="Simulador con dificultad adaptada y probabilidad estimada.">
        <div className="grid gap-3 md:grid-cols-3">
          <input className={inputCls} placeholder="Tema del examen" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <input className={inputCls} type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          <Btn busy={busy} onClick={async () => { setBusy(true); try { setExam(await fn({ data: { subjectId, topic, count: 8, minutes } })); setPicks({}); } finally { setBusy(false); } }}>
            <Timer className="h-3.5 w-3.5" /> Generar simulador
          </Btn>
        </div>
      </Card>
      {exam && (
        <>
          <Card title="Predicción">
            <Bar label="Probabilidad de aprobar (estimada)" value={exam.pass_probability} />
            <p className="mt-2 text-xs text-muted-foreground">{exam.note}</p>
          </Card>
          {exam.questions.map((q, i) => (
            <Card key={i} title={`Pregunta ${i + 1}`} subtitle={q.concept}>
              <p className="text-sm">{q.question}</p>
              <div className="mt-2 grid gap-1">
                {q.options.map((o, oi) => {
                  const chosen = picks[i] === oi;
                  const state = picks[i] != null ? (oi === q.answer ? "border-emerald-400/60" : chosen ? "border-red-400/60" : "border-border/40") : "border-border/40";
                  return (
                    <button key={oi} onClick={() => setPicks({ ...picks, [i]: oi })} className={`rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-foreground/5 ${state}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Card title="Resultado"><Bar label="Aciertos" value={(score / Math.max(1, exam.questions.length)) * 100} /></Card>
        </>
      )}
    </div>
  );
}

function Biblioteca() {
  const { data } = useMerlinDocuments();
  const { add } = useDocMutations();
  const askFn = useServerFn(askLibrary);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <Card title="Biblioteca inteligente" subtitle="Tus apuntes se convierten en base de conocimiento consultable.">
        <input className={inputCls} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${inputCls} mt-2 min-h-[110px]`} placeholder="Pega aquí tus apuntes, un PDF en texto o un resumen" value={content} onChange={(e) => setContent(e.target.value)} />
        <Btn className="mt-2" busy={add.isPending} onClick={() => title && content && add.mutate({ title, content }, { onSuccess: () => { setTitle(""); setContent(""); } })}>
          <BookOpen className="h-3.5 w-3.5" /> Analizar y guardar
        </Btn>
      </Card>
      <Card title="Preguntar a mis apuntes">
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué dice mi material sobre…?" />
          <Btn busy={busy} onClick={async () => { setBusy(true); try { setAns((await askFn({ data: { query: q } })).text); } finally { setBusy(false); } }}>Consultar</Btn>
        </div>
        {ans && <div className="mt-3"><Prose text={ans} /></div>}
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.documents ?? []).map((d) => (
          <Card key={d.id} title={d.title} subtitle={d.kind}>
            <p className="text-xs text-foreground/80 line-clamp-4">{d.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(d.concepts ?? []).slice(0, 6).map((c) => (
                <span key={c} className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px]">{c}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Laboratorio() {
  const fn = useServerFn(runLab);
  const [area, setArea] = useState("fisica");
  const [prompt, setPrompt] = useState("");
  const [sim, setSim] = useState<Awaited<ReturnType<typeof fn>> | null>(null);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const result = useMemo(() => {
    if (!sim?.formula) return null;
    try {
      const names = sim.variables.map((v) => v.name);
      const args = names.map((n) => vals[n] ?? sim.variables.find((v) => v.name === n)?.value ?? 0);
      // eslint-disable-next-line no-new-func
      const f = new Function(...names, `"use strict"; return (${sim.formula});`);
      const r = f(...args);
      return typeof r === "number" && Number.isFinite(r) ? r : null;
    } catch {
      return null;
    }
  }, [sim, vals]);

  return (
    <div className="space-y-4">
      <Card title="Laboratorio virtual" subtitle="Simulaciones parametrizables generadas para tu duda concreta.">
        <div className="grid gap-3 md:grid-cols-3">
          <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value)}>
            {["fisica", "quimica", "biologia", "matematicas", "economia"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input className={inputCls} placeholder="Ej. caída libre con rozamiento" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Btn busy={busy} onClick={async () => { setBusy(true); try { const s = await fn({ data: { area, prompt } }); setSim(s); setVals(Object.fromEntries(s.variables.map((v) => [v.name, v.value]))); } finally { setBusy(false); } }}>
            Simular
          </Btn>
        </div>
      </Card>
      {sim && (
        <Card title={sim.title}>
          <Prose text={sim.explanation} />
          <div className="mt-3 space-y-3">
            {sim.variables.map((v) => (
              <div key={v.name}>
                <div className="flex justify-between text-xs"><span>{v.name} ({v.unit})</span><span>{vals[v.name] ?? v.value}</span></div>
                <input type="range" min={v.min} max={v.max} step={(v.max - v.min) / 100} value={vals[v.name] ?? v.value}
                  onChange={(e) => setVals({ ...vals, [v.name]: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
              </div>
            ))}
          </div>
          <p className="mt-3 font-display text-xl glow-text">Resultado: {result != null ? result.toFixed(3) : "—"}</p>
          <ol className="mt-2 list-decimal pl-5 text-xs text-muted-foreground">{sim.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Card>
      )}
    </div>
  );
}

function Escritura() {
  const fn = useServerFn(writingCenter);
  const [task, setTask] = useState("corregir");
  const [style, setStyle] = useState("APA 7");
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Card title="Centro de escritura" subtitle="Redacción, estilo, coherencia y citas académicas.">
        <div className="grid gap-3 md:grid-cols-3">
          <select className={inputCls} value={task} onChange={(e) => setTask(e.target.value)}>
            {["corregir", "mejorar estilo", "estructurar ensayo", "humanizar", "generar citas", "resumir"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={style} onChange={(e) => setStyle(e.target.value)}>
            {["APA 7", "MLA 9", "Chicago", "IEEE"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Btn busy={busy} onClick={async () => { setBusy(true); try { setOut((await fn({ data: { task, text, style } })).text); } finally { setBusy(false); } }}>Procesar</Btn>
        </div>
        <textarea className={`${inputCls} mt-3 min-h-[160px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega tu texto" />
      </Card>
      {out && <Card title="Resultado"><Prose text={out} /></Card>}
    </div>
  );
}

function Investigacion() {
  const fn = useServerFn(research);
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Card title="Investigación académica" subtitle="Compara fuentes, evalúa fiabilidad y genera bibliografía.">
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tema a investigar" />
          <Btn busy={busy} onClick={async () => { setBusy(true); try { setOut((await fn({ data: { query: q } })).text); } finally { setBusy(false); } }}>Investigar</Btn>
        </div>
      </Card>
      {out && <Card title="Informe"><Prose text={out} /></Card>}
    </div>
  );
}

function Memoria() {
  const { data } = useMerlinOverview();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Memoria de evidencias" subtitle="Todo lo que Merlin cree saber, y por qué.">
        <div className="space-y-2">
          {(data?.evidence ?? []).map((e, i) => (
            <div key={i} className="rounded-lg border border-border/40 p-2">
              <div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-primary/80">{e.agent}</span><ConfidenceChip value={Number(e.confidence)} importance={(e.importance as "baja" | "media" | "alta") ?? "media"} /></div>
              <p className="text-sm">{e.summary}</p>
            </div>
          ))}
          {(data?.evidence ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin evidencias aún.</p>}
        </div>
      </Card>
      <Card title="Memoria de estrategias" subtitle="Qué funciona contigo y qué dejó de funcionar.">
        <div className="space-y-2">
          {(data?.strategies ?? []).map((s) => (
            <div key={s.id}>
              <Bar label={`${s.strategy} · ${s.concept_kind}`} value={Number(s.confidence)} />
              <p className="text-[10px] text-muted-foreground">{s.wins} aciertos / {s.losses} fallos</p>
            </div>
          ))}
          {(data?.strategies ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aún sin historial de estrategias.</p>}
        </div>
      </Card>
    </div>
  );
}

function Analitica() {
  const { data } = useMerlinOverview();
  const concepts = data?.concepts ?? [];
  const minutes = (data?.sessions ?? []).reduce((a, s) => a + (s.minutes ?? 0), 0);
  const dominados = concepts.filter((c) => c.status === "dominado").length;
  const dims = ["comprension", "aplicacion", "transferencia", "retencion"] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { l: "Conceptos", v: concepts.length },
          { l: "Dominados", v: dominados },
          { l: "Sesiones", v: (data?.sessions ?? []).length },
          { l: "Minutos", v: minutes },
        ].map((k) => (
          <Card key={k.l}><div className="text-center"><div className="font-display text-2xl glow-text">{k.v}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div></div></Card>
        ))}
      </div>
      <Card title="Perfil por dimensión">
        <div className="space-y-2">
          {dims.map((d) => {
            const vals = concepts.map((c) => ((c.mastery as Record<string, number>) ?? {})[d] ?? 0);
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            return <Bar key={d} label={d} value={avg} />;
          })}
        </div>
      </Card>
      <Card title="Evolución por concepto">
        <div className="space-y-2">{concepts.map((c) => <Bar key={c.id} label={c.name} value={Number(c.overall)} />)}</div>
      </Card>
    </div>
  );
}

function Gestion() {
  const { data } = useMerlinOverview();
  const { saveGoal } = useMerlinTracking();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  return (
    <div className="space-y-4">
      <Card title="Gestión escolar" subtitle="Tareas, exámenes, proyectos y entregas.">
        <div className="flex flex-wrap gap-2">
          <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Nueva meta o entrega" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={`${inputCls} w-44`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Btn busy={saveGoal.isPending} onClick={() => title && saveGoal.mutate({ title, target_date: date || undefined }, { onSuccess: () => { setTitle(""); setDate(""); } })}>
            <Plus className="h-3.5 w-3.5" /> Añadir
          </Btn>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.goals ?? []).map((g) => (
          <Card key={g.id} title={g.title} subtitle={g.target_date ?? "sin fecha"}>
            <Bar label="Progreso" value={Number(g.progress)} />
            <div className="mt-2 flex gap-2">
              {[25, 50, 75, 100].map((p) => (
                <Btn key={p} variant="ghost" onClick={() => saveGoal.mutate({ id: g.id, title: g.title, progress: p, status: p === 100 ? "cumplido" : "activo" })}>{p}%</Btn>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Colaboracion() {
  const fn = useServerFn(teach);
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Card title="Aprendizaje colaborativo" subtitle="Planes de estudio en equipo con roles y explicaciones cruzadas.">
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Tema del equipo de estudio" />
          <Btn busy={busy} onClick={async () => { setBusy(true); try { setOut((await fn({ data: { topic, mode: "crear", request: `Diseña una sesión de estudio colaborativa sobre ${topic}: roles, tiempos, preguntas cruzadas y criterios de evaluación entre pares.` } })).text); } finally { setBusy(false); } }}>Diseñar sesión</Btn>
        </div>
      </Card>
      {out && <Card title="Sesión colaborativa"><Prose text={out} /></Card>}
    </div>
  );
}

function Ajustes() {
  return (
    <Card title="Ajustes de Merlin" subtitle="Principios del sistema">
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
        <li>El sistema educativo aporta el conocimiento; Merlin aporta la adaptación; tú aportas la evidencia.</li>
        <li>Ninguna conclusión importante se aplica bajo su umbral de confianza (baja 60% · media 70% · alta 80%).</li>
        <li>Un 10/10 es evidencia de dominio, nunca dominio completo.</li>
        <li>Puedes navegar libremente fuera de la ruta: Merlin solo avisa de prerrequisitos faltantes.</li>
      </ul>
    </Card>
  );
}

/* ── Router de secciones ── */

export function MerlinSection({
  slug,
  subjectId,
  setSubjectId,
  onOpen,
}: {
  slug: string;
  subjectId?: string;
  setSubjectId: (id: string) => void;
  onOpen: (slug: string) => void;
}) {
  switch (slug) {
    case "mapa": return <Mapa subjectId={subjectId} setSubjectId={setSubjectId} />;
    case "profesor": return <Profesor subjectId={subjectId} />;
    case "ruta": return <Ruta subjectId={subjectId} />;
    case "diagnostico": return <Diagnostico subjectId={subjectId} />;
    case "practica": return <Practica subjectId={subjectId} />;
    case "examenes": return <Examenes subjectId={subjectId} />;
    case "biblioteca": return <Biblioteca />;
    case "laboratorio": return <Laboratorio />;
    case "escritura": return <Escritura />;
    case "investigacion": return <Investigacion />;
    case "memoria": return <Memoria />;
    case "analitica": return <Analitica />;
    case "gestion": return <Gestion />;
    case "colaboracion": return <Colaboracion />;
    case "ajustes": return <Ajustes />;
    default: return <Inicio onOpen={onOpen} />;
  }
}
