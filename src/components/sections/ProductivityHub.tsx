import { useMemo, useState, useEffect, useRef } from "react";
import {
  useProjects,
  useTasks,
  useTaskMutations,
  useGoals,
  useHabits,
  useFocusSessions,
  scoreTask,
  type Task,
} from "@/lib/productivity-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Check,
  Trash2,
  Flame,
  Target,
  CalendarDays,
  Timer,
  ListChecks,
  Sparkles,
} from "lucide-react";

const COLUMNS: Array<{ id: Task["status"]; label: string }> = [
  { id: "todo", label: "Por hacer" },
  { id: "doing", label: "En curso" },
  { id: "done", label: "Hecho" },
];

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-primary/25 bg-card/40 p-4 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

/* ----------------------------- KANBAN ----------------------------- */
function Kanban({ onSeedChat }: { onSeedChat?: (t: string) => void }) {
  const { data: tasks = [], isLoading } = useTasks();
  const { create, setStatus, remove } = useTaskMutations();
  const [title, setTitle] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    create.mutate({ title: t });
    setTitle("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva tarea…"
          className="bg-background/50"
        />
        <Button onClick={add} disabled={!title.trim()} size="icon" aria-label="Añadir tarea">
          <Plus className="h-4 w-4" />
        </Button>
        {onSeedChat && (
          <Button
            variant="outline"
            onClick={() => onSeedChat("Crea un plan completo con tareas para: ")}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Plan IA
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) setStatus.mutate({ id: dragId, status: col.id });
                setDragId(null);
              }}
              className="rounded-xl border border-primary/20 bg-background/30 p-3 min-h-[220px]"
            >
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-primary/80">
                <span>{col.label}</span>
                <span className="text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {isLoading && <div className="text-xs text-muted-foreground">Cargando…</div>}
                {!isLoading && !items.length && (
                  <div className="text-xs text-muted-foreground">Sin tareas</div>
                )}
                {items.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className="group rounded-lg border border-primary/25 bg-card/60 p-2.5 text-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            t.priority <= 1
                              ? "oklch(0.7 0.2 25)"
                              : t.priority === 2
                                ? "oklch(0.78 0.17 80)"
                                : "oklch(0.7 0.12 200)",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={t.status === "done" ? "line-through opacity-60" : ""}>
                          {t.title}
                        </div>
                        {t.due_date && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            vence {t.due_date}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition">
                        {t.status !== "done" && (
                          <button
                            aria-label="Completar"
                            onClick={() => setStatus.mutate({ id: t.id, status: "done" })}
                            className="grid h-6 w-6 place-items-center rounded border border-primary/30 hover:bg-primary/20"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          aria-label="Eliminar"
                          onClick={() => remove.mutate(t.id)}
                          className="grid h-6 w-6 place-items-center rounded border border-destructive/30 hover:bg-destructive/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- GANTT ----------------------------- */
function Gantt() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const days = 21;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = tasks
    .filter((t) => t.due_date)
    .slice(0, 14)
    .map((t) => {
      const s = t.start_date ? new Date(t.start_date) : start;
      const e = new Date(t.due_date!);
      const offset = Math.max(0, Math.round((s.getTime() - start.getTime()) / 86400000));
      const span = Math.min(days - offset, Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1));
      const project = projects.find((p) => p.id === t.project_id);
      return { ...t, offset, span: Math.max(1, span), color: project?.color ?? "oklch(0.75 0.18 280)" };
    });

  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
        <CalendarDays className="h-3.5 w-3.5" /> Línea de tiempo · próximos {days} días
      </div>
      {!rows.length && (
        <div className="text-xs text-muted-foreground">
          Añade fechas límite a tus tareas (o pide un plan a la IA) para ver el Gantt.
        </div>
      )}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <div className="w-32 shrink-0 truncate text-xs text-foreground/80">{r.title}</div>
            <div className="relative h-5 flex-1 rounded bg-background/40">
              <div
                className="absolute top-0 h-5 rounded"
                style={{
                  left: `${(r.offset / days) * 100}%`,
                  width: `${(r.span / days) * 100}%`,
                  background: `linear-gradient(90deg, ${r.color}, color-mix(in oklab, ${r.color} 40%, transparent))`,
                }}
                title={`${r.title} · ${r.due_date}`}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ----------------------------- AGENDA ----------------------------- */
function SmartCalendar() {
  const { data: tasks = [] } = useTasks();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Panel>
      <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-primary/80">
        Calendario inteligente · 7 días
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {days.map((d) => {
          const k = dayKey(d);
          const items = tasks.filter((t) => t.due_date === k && t.status !== "done");
          const load = items.reduce((a, t) => a + (t.estimate_minutes ?? 30), 0);
          return (
            <div key={k} className="rounded-lg border border-primary/20 bg-background/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground">
                {d.toLocaleDateString("es", { weekday: "short", day: "numeric" })}
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 4).map((t) => (
                  <div key={t.id} className="truncate rounded bg-primary/15 px-1.5 py-0.5 text-[11px]">
                    {t.title}
                  </div>
                ))}
                {!items.length && <div className="text-[10px] text-muted-foreground">libre</div>}
              </div>
              {load > 0 && (
                <div className="mt-1.5 text-[10px] text-primary/80">{Math.round(load / 6) / 10} h</div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ----------------------------- GOALS ----------------------------- */
function Goals() {
  const { data: goals = [], setProgress, create } = useGoals();
  const [title, setTitle] = useState("");
  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
        <Target className="h-3.5 w-3.5" /> Objetivos
      </div>
      <div className="mb-3 flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              create.mutate(title.trim());
              setTitle("");
            }
          }}
          placeholder="Nuevo objetivo…"
          className="bg-background/50"
        />
      </div>
      <div className="space-y-3">
        {!goals.length && <div className="text-xs text-muted-foreground">Aún no hay objetivos.</div>}
        {goals.map((g) => (
          <div key={g.id}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{g.title}</span>
              <span className="text-xs text-primary">{g.progress}%</span>
            </div>
            <Progress value={g.progress} className="mt-1.5 h-1.5" />
            <div className="mt-1 flex gap-1">
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setProgress.mutate({ id: g.id, progress: p })}
                  className="rounded border border-primary/25 px-1.5 py-0.5 text-[10px] hover:bg-primary/20"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ----------------------------- HABITS ----------------------------- */
function Habits() {
  const { data, create, toggleToday } = useHabits();
  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];
  const [name, setName] = useState("");
  const today = dayKey(new Date());
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return dayKey(d);
  });

  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
        <Flame className="h-3.5 w-3.5" /> Hábitos y rutinas
      </div>
      <div className="mb-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              create.mutate(name.trim());
              setName("");
            }
          }}
          placeholder="Nuevo hábito…"
          className="bg-background/50"
        />
      </div>
      <div className="space-y-2">
        {!habits.length && <div className="text-xs text-muted-foreground">Sin hábitos todavía.</div>}
        {habits.map((h) => {
          const hl = logs.filter((l) => l.habit_id === h.id).map((l) => l.done_on);
          const doneToday = hl.includes(today);
          let streak = 0;
          for (let i = 0; i < 60; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            if (hl.includes(dayKey(d))) streak++;
            else if (i > 0) break;
          }
          return (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-background/30 p-2">
              <button
                onClick={() => toggleToday.mutate({ habit_id: h.id, done: doneToday })}
                aria-label={doneToday ? "Desmarcar hoy" : "Marcar hoy"}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                  doneToday ? "border-primary bg-primary/30" : "border-primary/30"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{h.name}</div>
                <div className="mt-1 flex gap-0.5">
                  {last7.map((d) => (
                    <span
                      key={d}
                      className={`h-1.5 w-4 rounded-sm ${hl.includes(d) ? "bg-primary" : "bg-primary/15"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-xs text-primary">🔥 {streak}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ----------------------------- POMODORO ----------------------------- */
function Pomodoro() {
  const { log, data: sessions = [] } = useFocusSessions();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const loggedRef = useRef(false);

  const total = mode === "focus" ? 25 * 60 : 5 * 60;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secs === 0 && running && !loggedRef.current) {
      loggedRef.current = true;
      setRunning(false);
      log.mutate({ minutes: total / 60, kind: mode });
    }
    if (secs > 0) loggedRef.current = false;
  }, [secs, running, mode, total, log]);

  const switchMode = (m: "focus" | "break") => {
    setMode(m);
    setSecs(m === "focus" ? 25 * 60 : 5 * 60);
    setRunning(false);
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const weekMinutes = sessions
    .filter((s) => s.kind === "focus")
    .reduce((a, s) => a + s.minutes, 0);

  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
        <Timer className="h-3.5 w-3.5" /> Pomodoro
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="font-display text-5xl tracking-widest glow-text tabular-nums">
          {mm}:{ss}
        </div>
        <Progress value={((total - secs) / total) * 100} className="h-1.5 w-full" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-4 w-4 mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
            {running ? "Pausar" : "Iniciar"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => switchMode(mode)}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reiniciar
          </Button>
        </div>
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => switchMode("focus")}
            className={`rounded px-2 py-1 border ${mode === "focus" ? "border-primary bg-primary/20" : "border-primary/25"}`}
          >
            Enfoque 25′
          </button>
          <button
            onClick={() => switchMode("break")}
            className={`rounded px-2 py-1 border ${mode === "break" ? "border-primary bg-primary/20" : "border-primary/25"}`}
          >
            Descanso 5′
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {weekMinutes} min de enfoque esta semana
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------- SUMMARY ----------------------------- */
function SummaryStrip({ onSeedChat }: { onSeedChat?: (t: string) => void }) {
  const { data: tasks = [] } = useTasks();
  const { data: sessions = [] } = useFocusSessions();

  const stats = useMemo(() => {
    const todayStr = dayKey(new Date());
    const open = tasks.filter((t) => t.status !== "done");
    const doneToday = tasks.filter(
      (t) => t.completed_at && t.completed_at.slice(0, 10) === todayStr,
    ).length;
    const overdue = open.filter((t) => t.due_date && t.due_date < todayStr).length;
    const focus = sessions.filter((s) => s.kind === "focus").reduce((a, s) => a + s.minutes, 0);
    const ranked = [...open].sort((a, b) => scoreTask(b) - scoreTask(a)).slice(0, 3);
    const completion = tasks.length
      ? Math.round(((tasks.length - open.length) / tasks.length) * 100)
      : 0;
    return { open: open.length, doneToday, overdue, focus, ranked, completion };
  }, [tasks, sessions]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { l: "Abiertas", v: stats.open },
        { l: "Hechas hoy", v: stats.doneToday },
        { l: "Atrasadas", v: stats.overdue },
        { l: "Enfoque 7d", v: `${stats.focus}′` },
      ].map((s) => (
        <Panel key={s.l} className="py-3">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{s.l}</div>
          <div className="font-display text-2xl glow-text">{s.v}</div>
        </Panel>
      ))}
      <Panel className="col-span-2 lg:col-span-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
            <ListChecks className="h-3.5 w-3.5" /> Priorización automática · hoy
          </div>
          {onSeedChat && (
            <button
              onClick={() => onSeedChat("Dame mi resumen diario y prioriza mis tareas")}
              className="text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              Resumen IA
            </button>
          )}
        </div>
        <ol className="space-y-1 text-sm">
          {!stats.ranked.length && (
            <li className="text-xs text-muted-foreground">Nada pendiente. Buen trabajo.</li>
          )}
          {stats.ranked.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="text-primary">{i + 1}.</span>
              <span className="truncate">{t.title}</span>
              {t.due_date && (
                <span className="text-[10px] text-muted-foreground">· {t.due_date}</span>
              )}
            </li>
          ))}
        </ol>
        <Progress value={stats.completion} className="mt-3 h-1.5" />
        <div className="mt-1 text-[10px] text-muted-foreground">
          Progreso global {stats.completion}%
        </div>
      </Panel>
    </div>
  );
}

export function ProductivityHub({ onSeedChat }: { onSeedChat?: (text: string) => void }) {
  return (
    <div className="space-y-4">
      <SummaryStrip onSeedChat={onSeedChat} />
      <Tabs defaultValue="kanban">
        <TabsList className="bg-card/40">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="habitos">Hábitos</TabsTrigger>
          <TabsTrigger value="enfoque">Enfoque</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <Kanban onSeedChat={onSeedChat} />
        </TabsContent>
        <TabsContent value="gantt" className="mt-4">
          <Gantt />
        </TabsContent>
        <TabsContent value="agenda" className="mt-4">
          <SmartCalendar />
        </TabsContent>
        <TabsContent value="objetivos" className="mt-4">
          <Goals />
        </TabsContent>
        <TabsContent value="habitos" className="mt-4">
          <Habits />
        </TabsContent>
        <TabsContent value="enfoque" className="mt-4">
          <Pomodoro />
        </TabsContent>
      </Tabs>
    </div>
  );
}
