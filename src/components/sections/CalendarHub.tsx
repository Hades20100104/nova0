import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCalendarEvents,
  useEventMutations,
  expandOccurrences,
  findConflicts,
  freeSlots,
  toICS,
  parseICS,
  type CalendarEvent,
} from "@/lib/calendar-data";
import { useTasks } from "@/lib/productivity-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Bell, Repeat, AlertTriangle,
  Upload, Download, CalendarDays, Sparkles, Link2, Clock,
} from "lucide-react";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const RECURRENCES = [
  { id: "none", label: "Una vez" },
  { id: "daily", label: "Diario" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensual" },
  { id: "yearly", label: "Anual" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Draft = {
  id?: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  all_day: boolean;
  recurrence: string;
  reminder_minutes: number | null;
  task_id: string | null;
};

const emptyDraft = (day: Date): Draft => {
  const s = new Date(day);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    location: "",
    start: toLocalInput(s),
    end: toLocalInput(e),
    all_day: false,
    recurrence: "none",
    reminder_minutes: 10,
    task_id: null,
  };
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-primary/25 bg-card/40 p-4 ${className}`}>{children}</div>;
}

export function CalendarHub() {
  const { data: events = [], isLoading } = useCalendarEvents();
  const { create, update, remove } = useEventMutations();
  const { data: tasks = [] } = useTasks();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const notified = useRef<Set<string>>(new Set());

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  const occs = useMemo(
    () => expandOccurrences(events, new Date(monthStart.getTime() - 7 * 864e5), new Date(monthEnd.getTime() + 7 * 864e5)),
    [events, monthStart.getTime(), monthEnd.getTime()],
  );
  const conflicts = useMemo(() => findConflicts(occs), [occs]);
  const dayOccs = useMemo(() => occs.filter((o) => sameDay(o.occStart, selected)), [occs, selected]);
  const slots = useMemo(() => freeSlots(occs, selected), [occs, selected]);

  /* browser reminders */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const tick = () => {
      const now = Date.now();
      for (const o of occs) {
        if (o.reminder_minutes == null) continue;
        const at = o.occStart.getTime() - o.reminder_minutes * 60000;
        const id = `${o.id}-${o.occStart.getTime()}`;
        if (now >= at && now < at + 60000 && !notified.current.has(id)) {
          notified.current.add(id);
          if (Notification.permission === "granted") {
            new Notification(o.title, { body: `Empieza a las ${hhmm(o.occStart)}` });
          } else {
            toast(o.title, { description: `Empieza a las ${hhmm(o.occStart)}` });
          }
        }
      }
    };
    const t = setInterval(tick, 30000);
    tick();
    return () => clearInterval(t);
  }, [occs]);

  const grid = useMemo(() => {
    const first = new Date(monthStart);
    const offset = (first.getDay() + 6) % 7;
    const cells: Array<Date | null> = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= monthEnd.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, monthStart.getTime(), monthEnd.getTime()]);

  const save = async () => {
    if (!draft || !draft.title.trim()) return toast.error("Ponle un título al evento");
    const payload = {
      title: draft.title.trim(),
      description: draft.description || null,
      location: draft.location || null,
      starts_at: new Date(draft.start).toISOString(),
      ends_at: new Date(draft.end).toISOString(),
      all_day: draft.all_day,
      recurrence: draft.recurrence,
      reminder_minutes: draft.reminder_minutes,
      task_id: draft.task_id,
      source: "user",
    };
    try {
      if (draft.id) await update.mutateAsync({ id: draft.id, ...payload });
      else await create.mutateAsync(payload as never);
      toast.success(draft.id ? "Evento actualizado" : "Evento creado");
      setDraft(null);
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const editEvent = (e: CalendarEvent) =>
    setDraft({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      location: e.location ?? "",
      start: toLocalInput(new Date(e.starts_at)),
      end: toLocalInput(new Date(e.ends_at)),
      all_day: e.all_day,
      recurrence: e.recurrence ?? "none",
      reminder_minutes: e.reminder_minutes,
      task_id: e.task_id,
    });

  const exportICS = () => {
    const blob = new Blob([toICS(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nova-calendario.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importICS = async (file: File) => {
    const parsed = parseICS(await file.text());
    if (!parsed.length) return toast.error("No se encontraron eventos en el archivo");
    let ok = 0;
    for (const p of parsed) {
      try {
        await create.mutateAsync(p);
        ok++;
      } catch {
        /* skip duplicates */
      }
    }
    toast.success(`${ok} eventos importados de Google Calendar`);
  };

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-display tracking-[0.2em] text-lg min-w-[190px] text-center">
          {cursor.toLocaleDateString("es", { month: "long", year: "numeric" }).toUpperCase()}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>Hoy</Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setDraft(emptyDraft(selected))}><Plus className="h-4 w-4 mr-1" />Nuevo evento</Button>
        <Button size="sm" variant="ghost" onClick={exportICS}><Download className="h-4 w-4 mr-1" />Exportar</Button>
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Importar .ics</Button>
        <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
          onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void importICS(f); ev.target.value = ""; }} />
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {conflicts.length} conflicto{conflicts.length > 1 ? "s" : ""} de horario · p.ej. “{conflicts[0]![0].title}” con “{conflicts[0]![1].title}”
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* month grid */}
        <Card>
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground pb-1">{d}</div>
            ))}
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const list = occs.filter((o) => sameDay(o.occStart, d));
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, new Date());
              return (
                <button key={i} onClick={() => setSelected(d)}
                  className={`aspect-square rounded-lg border p-1 text-left transition ${
                    isSel ? "border-primary bg-primary/25" : isToday ? "border-primary/60 bg-card/60" : "border-primary/20 bg-card/30 hover:bg-card/50"
                  }`}>
                  <div className={`text-[11px] ${isToday ? "glow-text" : ""}`}>{d.getDate()}</div>
                  <div className="mt-0.5 space-y-0.5">
                    {list.slice(0, 2).map((o, j) => (
                      <div key={j} className="truncate rounded px-1 text-[9px]"
                        style={{ background: `color-mix(in oklch, ${o.color} 30%, transparent)` }}>{o.title}</div>
                    ))}
                    {list.length > 2 && <div className="text-[9px] text-muted-foreground">+{list.length - 2}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          {isLoading && <div className="mt-3 text-xs text-muted-foreground">Cargando tu calendario…</div>}
        </Card>

        {/* day panel */}
        <div className="space-y-3">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">{selected.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div>
            </div>
            {dayOccs.length === 0 && <p className="text-xs text-muted-foreground">Día libre. Aprovéchalo o crea un bloque.</p>}
            <div className="space-y-2">
              {dayOccs.map((o, i) => (
                <div key={i} className="rounded-xl border border-primary/25 bg-card/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-1 self-stretch rounded-full" style={{ background: o.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{o.title}</div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                        <span><Clock className="inline h-3 w-3 mr-1" />{o.all_day ? "Todo el día" : `${hhmm(o.occStart)}–${hhmm(o.occEnd)}`}</span>
                        {o.recurrence !== "none" && <span><Repeat className="inline h-3 w-3 mr-1" />{RECURRENCES.find((r) => r.id === o.recurrence)?.label}</span>}
                        {o.reminder_minutes != null && <span><Bell className="inline h-3 w-3 mr-1" />{o.reminder_minutes}m</span>}
                        {o.task_id && <span><Link2 className="inline h-3 w-3 mr-1" />tarea</span>}
                        {o.source === "ai" && <span className="text-primary"><Sparkles className="inline h-3 w-3 mr-1" />IA</span>}
                      </div>
                      {o.location && <div className="text-[11px] text-muted-foreground">{o.location}</div>}
                    </div>
                    <button className="text-muted-foreground hover:text-foreground text-[11px]" onClick={() => editEvent(o)}>Editar</button>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(o.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-2">Disponibilidad</div>
            {slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin huecos libres de 30 min entre 08:00 y 21:00.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s, i) => (
                  <button key={i}
                    onClick={() => setDraft({ ...emptyDraft(selected), start: toLocalInput(s.start), end: toLocalInput(new Date(Math.min(s.end.getTime(), s.start.getTime() + 36e5))) })}
                    className="rounded-lg border border-primary/30 bg-card/40 px-2 py-1 text-[11px] hover:bg-primary/15">
                    {hhmm(s.start)}–{hhmm(s.end)}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* editor */}
      {draft && (
        <Card className="space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
            {draft.id ? "Editar evento" : "Nuevo evento"}
          </div>
          <Input placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Inicio
              <Input type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">Fin
              <Input type="datetime-local" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">Repetición
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}>
                {RECURRENCES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Recordatorio (min)
              <Input type="number" min={0} value={draft.reminder_minutes ?? ""} placeholder="sin recordatorio"
                onChange={(e) => setDraft({ ...draft, reminder_minutes: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
            <label className="text-xs text-muted-foreground">Tarea asociada
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.task_id ?? ""} onChange={(e) => setDraft({ ...draft, task_id: e.target.value || null })}>
                <option value="">Ninguna</option>
                {tasks.filter((t) => t.status !== "done").map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
          </div>
          <Input placeholder="Ubicación" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <Textarea placeholder="Notas" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={draft.all_day} onChange={(e) => setDraft({ ...draft, all_day: e.target.checked })} />
            Todo el día
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={create.isPending || update.isPending}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
