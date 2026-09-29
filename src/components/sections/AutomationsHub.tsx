import { useMemo, useState } from "react";
import { useAutomations, useAutomationMutations, type Step, type Trigger } from "@/lib/automations-data";
import { useAutomationsRunner } from "@/hooks/use-automations-runner";
import {
  Plus, Play, Trash2, Zap, Clock, Repeat, Mic, Hand, ChevronRight, Loader2, Power,
} from "lucide-react";
import { toast } from "sonner";

const STEP_META: Record<Step["type"], { label: string; hint: string }> = {
  ai: { label: "IA", hint: "Instrucción para el agente (puede usar herramientas)" },
  notify: { label: "Notificar", hint: "Mensaje que verás en pantalla" },
  speak: { label: "Voz", hint: "Texto que se leerá en voz alta" },
  task: { label: "Tarea", hint: "Título de la tarea a crear" },
  open_section: { label: "Abrir sección", hint: "Slug de la sección" },
};

const TRIGGER_ICON: Record<string, React.ReactNode> = {
  manual: <Hand className="h-3.5 w-3.5" />,
  time: <Clock className="h-3.5 w-3.5" />,
  interval: <Repeat className="h-3.5 w-3.5" />,
  voice: <Mic className="h-3.5 w-3.5" />,
  app_open: <Zap className="h-3.5 w-3.5" />,
};

function triggerLabel(t: Trigger | Record<string, unknown>): string {
  const x = t as { type?: string; at?: string; minutes?: number; phrase?: string };
  if (x.type === "time") return `Cada día a las ${x.at}`;
  if (x.type === "interval") return `Cada ${x.minutes} min`;
  if (x.type === "voice") return `Al decir “${x.phrase}”`;
  if (x.type === "app_open") return "Al abrir la app";
  return "Manual";
}

export function AutomationsHub() {
  const { data: automations = [], isLoading } = useAutomations();
  const { save, toggle, remove, run } = useAutomationMutations();
  const [editing, setEditing] = useState<null | { id?: string; name: string; trigger: Trigger; steps: Step[] }>(null);

  useAutomationsRunner(true);

  const active = useMemo(() => automations.filter((a) => a.enabled).length, [automations]);

  const blank = () => ({
    name: "Nuevo flujo",
    trigger: { type: "manual" } as Trigger,
    steps: [{ type: "ai", prompt: "" }] as Step[],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Metric label="Flujos" value={automations.length} />
        <Metric label="Activos" value={active} />
        <button
          onClick={() => setEditing(blank())}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono hover:bg-primary/25 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo flujo
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando flujos…
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {automations.map((a) => (
          <div key={a.id} className="rounded-xl border border-primary/25 bg-card/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-primary/80 font-mono">
                  {TRIGGER_ICON[a.trigger_type] ?? TRIGGER_ICON.manual}
                  {triggerLabel(a.trigger_config)}
                </div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })}
                title={a.enabled ? "Desactivar" : "Activar"}
                className={`rounded-full border p-1.5 transition ${
                  a.enabled ? "border-primary bg-primary/20 text-primary" : "border-border/50 text-muted-foreground"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {(a.action_config?.steps ?? []).map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="rounded-full border border-primary/30 bg-background/40 px-2 py-0.5">
                    {STEP_META[s.type]?.label ?? s.type}
                  </span>
                  {i < (a.action_config?.steps?.length ?? 0) - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              ))}
            </div>

            {a.last_state && (
              <div className="line-clamp-2 text-[10px] text-muted-foreground">{a.last_state}</div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  run.mutate(a.id, {
                    onSuccess: (r) => toast.success(`${a.name} ejecutado`, { description: r.log.join(" · ").slice(0, 160) }),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                  })
                }
                disabled={run.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/20 transition"
              >
                {run.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Ejecutar
              </button>
              <button
                onClick={() =>
                  setEditing({
                    id: a.id,
                    name: a.name,
                    trigger: a.trigger_config as Trigger,
                    steps: a.action_config?.steps ?? [],
                  })
                }
                className="rounded-full border border-border/50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/10 transition"
              >
                Editar
              </button>
              <button
                onClick={() => remove.mutate(a.id)}
                className="ml-auto rounded-full border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <FlowEditor
          value={editing}
          saving={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(v) =>
            save.mutate(
              { ...v, enabled: true },
              {
                onSuccess: () => {
                  toast.success("Flujo guardado");
                  setEditing(null);
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
              },
            )
          }
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.25em] text-primary">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}

function FlowEditor({
  value, onSave, onCancel, saving,
}: {
  value: { id?: string; name: string; trigger: Trigger; steps: Step[] };
  onSave: (v: { id?: string; name: string; trigger: Trigger; steps: Step[] }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(value.name);
  const [trigger, setTrigger] = useState<Trigger>(value.trigger);
  const [steps, setSteps] = useState<Step[]>(value.steps.length ? value.steps : [{ type: "ai", prompt: "" }]);

  const setStep = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? ({ ...st, ...patch } as Step) : st)));

  const stepValue = (s: Step): string =>
    s.type === "ai" ? s.prompt : s.type === "notify" ? s.message : s.type === "speak" ? s.text : s.type === "task" ? s.title : s.slug;

  const setStepValue = (i: number, s: Step, v: string) => {
    const key = s.type === "ai" ? "prompt" : s.type === "notify" ? "message" : s.type === "speak" ? "text" : s.type === "task" ? "title" : "slug";
    setStep(i, { [key]: v } as Partial<Step>);
  };

  const changeType = (i: number, type: Step["type"]) => {
    const base: Record<Step["type"], Step> = {
      ai: { type: "ai", prompt: "" },
      notify: { type: "notify", message: "" },
      speak: { type: "speak", text: "" },
      task: { type: "task", title: "" },
      open_section: { type: "open_section", slug: "" },
    };
    setSteps((s) => s.map((st, idx) => (idx === i ? base[type] : st)));
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-card/60 p-4 space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del flujo"
        className="w-full rounded-md border border-primary/30 bg-background/50 px-3 py-2 text-sm"
      />

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">Disparador</div>
        <div className="flex flex-wrap gap-2">
          {(["manual", "time", "interval", "voice", "app_open"] as const).map((t) => (
            <button
              key={t}
              onClick={() =>
                setTrigger(
                  t === "time"
                    ? { type: "time", at: "09:00" }
                    : t === "interval"
                      ? { type: "interval", minutes: 60 }
                      : t === "voice"
                        ? { type: "voice", phrase: "activa protocolo" }
                        : { type: t },
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-mono transition ${
                trigger.type === t ? "border-primary bg-primary/20" : "border-primary/30 hover:bg-primary/10"
              }`}
            >
              {TRIGGER_ICON[t]} {t === "app_open" ? "Al abrir" : t}
            </button>
          ))}
        </div>
        {trigger.type === "time" && (
          <input
            type="time"
            value={trigger.at}
            onChange={(e) => setTrigger({ type: "time", at: e.target.value })}
            className="rounded-md border border-primary/30 bg-background/50 px-3 py-1.5 text-sm"
          />
        )}
        {trigger.type === "interval" && (
          <input
            type="number"
            min={5}
            max={1440}
            value={trigger.minutes}
            onChange={(e) => setTrigger({ type: "interval", minutes: Number(e.target.value) })}
            className="w-28 rounded-md border border-primary/30 bg-background/50 px-3 py-1.5 text-sm"
          />
        )}
        {trigger.type === "voice" && (
          <input
            value={trigger.phrase}
            onChange={(e) => setTrigger({ type: "voice", phrase: e.target.value })}
            placeholder="frase de activación"
            className="w-full rounded-md border border-primary/30 bg-background/50 px-3 py-1.5 text-sm"
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">Cadena de acciones</div>
        {steps.map((s, i) => (
          <div key={i} className="rounded-lg border border-primary/25 bg-background/40 p-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
              {(Object.keys(STEP_META) as Step["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => changeType(i, t)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                    s.type === t ? "border-primary bg-primary/20" : "border-primary/25 hover:bg-primary/10"
                  }`}
                >
                  {STEP_META[t].label}
                </button>
              ))}
              {steps.length > 1 && (
                <button
                  onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-auto text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <textarea
              value={stepValue(s)}
              onChange={(e) => setStepValue(i, s, e.target.value)}
              placeholder={STEP_META[s.type].hint}
              rows={s.type === "ai" ? 3 : 1}
              className="w-full resize-none rounded-md border border-primary/25 bg-card/50 px-2.5 py-1.5 text-sm"
            />
          </div>
        ))}
        {steps.length < 8 && (
          <button
            onClick={() => setSteps((s) => [...s, { type: "notify", message: "" }])}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/10 transition"
          >
            <Plus className="h-3 w-3" /> Añadir paso
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ id: value.id, name, trigger, steps })}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/20 px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono hover:bg-primary/30 transition"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />} Guardar flujo
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border border-border/50 px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono hover:bg-primary/10 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
