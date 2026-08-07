import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  usePersona, PERSONALITIES, STYLES, SPEEDS, LANGUAGES,
  type CustomWidget, type CustomTheme,
} from "@/lib/personalization";
import { generateAppearance, generateWidget } from "@/lib/personalize.functions";
import { useTasks } from "@/lib/productivity-data";
import { useModuleStats } from "@/lib/module-stats";
import { Sparkles, Loader2, Trash2, Plus, Wand2, Check } from "lucide-react";

/* ---------------- Personality ---------------- */

function PersonalityTab() {
  const { persona, update } = usePersona();
  return (
    <div className="space-y-5">
      <div>
        <Label>Personalidad</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              onClick={() => update({ personality: p.id })}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                persona.personality === p.id ? "border-primary bg-primary/15" : "border-primary/25 bg-card/40 hover:bg-primary/10"
              }`}
            >
              <div className="text-sm">{p.label}</div>
              <div className="text-[10px] text-muted-foreground">{p.blurb}</div>
            </button>
          ))}
        </div>
        {persona.personality === "custom" && (
          <textarea
            value={persona.customPersona}
            onChange={(e) => update({ customPersona: e.target.value })}
            rows={3}
            placeholder="Describe cómo quieres que sea tu asistente…"
            className="mt-2 w-full resize-none rounded-md border border-primary/30 bg-card/50 px-3 py-2 text-sm"
          />
        )}
      </div>

      <Chips label="Estilo" options={STYLES} value={persona.style} onChange={(v) => update({ style: v as never })} />
      <Chips label="Velocidad" options={SPEEDS} value={persona.speed} onChange={(v) => update({ speed: v as never })} />
      <Chips label="Idioma" options={LANGUAGES} value={persona.language} onChange={(v) => update({ language: v })} />

      <div>
        <div className="flex justify-between text-xs">
          <span>Profundidad</span>
          <span className="font-mono">{persona.depth}/5</span>
        </div>
        <input
          type="range" min={1} max={5} value={persona.depth}
          onChange={(e) => update({ depth: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      <button
        onClick={() => update({ emoji: !persona.emoji })}
        className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-mono transition ${
          persona.emoji ? "border-primary bg-primary/20" : "border-primary/30 hover:bg-primary/10"
        }`}
      >
        Emojis {persona.emoji ? "activados" : "desactivados"}
      </button>
    </div>
  );
}

/* ---------------- Appearance (AI palettes) ---------------- */

function AppearanceTab({ assistant }: { assistant: "nova" | "nevira" }) {
  const { persona, update } = usePersona();
  const gen = useServerFn(generateAppearance);
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<"nova" | "nevira" | "both">(assistant);
  const [busy, setBusy] = useState(false);

  const activeFor = (a: "nova" | "nevira") => persona.activeThemes?.[a] ?? null;

  const activate = (id: string | null, scope: "nova" | "nevira" | "both") => {
    const next = { ...persona.activeThemes };
    if (scope === "both") {
      next.nova = id;
      next.nevira = id;
    } else next[scope] = id;
    update({ activeThemes: next });
  };

  const create = async () => {
    if (prompt.trim().length < 2) return;
    setBusy(true);
    try {
      const { theme } = await gen({ data: { prompt: prompt.trim(), assistant: target } });
      const created = { ...(theme as CustomTheme), scope: target };
      const themes = [...persona.customThemes, created].slice(-12);
      const next = { ...persona.activeThemes };
      if (target === "both") {
        next.nova = created.id;
        next.nevira = created.id;
      } else next[target] = created.id;
      update({ customThemes: themes, activeThemes: next });
      setPrompt("");
      toast.success(`Apariencia "${created.label}" aplicada a ${target.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la apariencia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Apariencia generada con IA</Label>

      <div className="flex flex-wrap gap-2">
        {(["nova", "nevira", "both"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono transition ${
              target === t ? "border-primary bg-primary/20" : "border-primary/30 bg-card/40 hover:bg-primary/10"
            }`}
          >
            {t === "both" ? "Ambos" : t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="ej. atardecer en Marte, neón japonés, acero ártico…"
          className="flex-1 rounded-md border border-primary/30 bg-card/50 px-3 py-2 text-sm"
        />
        <button
          onClick={create}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/25 transition"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Crear
        </button>
      </div>

      {(activeFor("nova") || activeFor("nevira")) && (
        <div className="flex flex-wrap gap-2">
          {(["nova", "nevira"] as const)
            .filter((a) => activeFor(a))
            .map((a) => (
              <button
                key={a}
                onClick={() => activate(null, a)}
                className="rounded-full border border-border/50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/10 transition"
              >
                Restaurar paleta base de {a}
              </button>
            ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {persona.customThemes.map((t) => {
          const used = (["nova", "nevira"] as const).filter((a) => activeFor(a) === t.id);
          return (
            <div key={t.id} className="relative">
              <button
                onClick={() => activate(t.id, target)}
                className="w-full rounded-xl border border-primary/25 p-3 text-left transition hover:border-primary"
                style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}
              >
                <span className="block text-xs font-medium text-background/90">{t.label}</span>
                <span className="mt-6 block h-1.5 rounded-full" style={{ background: t.glow }} />
              </button>
              {used.length > 0 && (
                <span className="absolute top-1.5 right-8 flex items-center gap-1 rounded-full bg-background/85 border border-primary px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-primary">
                  <Check className="h-2.5 w-2.5" /> {used.join(" · ")}
                </span>
              )}
              <button
                onClick={() => {
                  const next = { ...persona.activeThemes };
                  if (next.nova === t.id) next.nova = null;
                  if (next.nevira === t.id) next.nevira = null;
                  update({ customThemes: persona.customThemes.filter((x) => x.id !== t.id), activeThemes: next });
                }}
                className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-1 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ---------------- Widgets ---------------- */

export function CustomWidgets({ onSeedChat }: { onSeedChat?: (text: string) => void }) {
  const { persona } = usePersona();
  const { data: tasks = [] } = useTasks();
  const { data: stats } = useModuleStats();
  if (!persona.widgets.length) return null;

  const counts: Record<string, number> = {
    tasks: tasks.filter((t) => t.status !== "done").length,
    images: stats?.imagesTotal ?? 0,
    documents: stats?.docsTotal ?? 0,
    memory: stats?.memoryTotal ?? 0,
    threads: stats?.threadsTotal ?? 0,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {persona.widgets.map((w) => (
        <WidgetCard key={w.id} widget={w} counts={counts} onSeedChat={onSeedChat} />
      ))}
    </div>
  );
}

function WidgetCard({
  widget: w, counts, onSeedChat,
}: {
  widget: CustomWidget;
  counts: Record<string, number>;
  onSeedChat?: (text: string) => void;
}) {
  const accent = w.accent || "var(--primary)";
  const body = () => {
    if (w.kind === "clock") return <Clock />;
    if (w.kind === "counter") return <div className="font-mono text-2xl">{counts[w.source ?? "tasks"] ?? 0}</div>;
    if (w.kind === "progress") {
      const pct = Math.min(100, Math.round(((w.value ?? 0) / (w.target || 100)) * 100));
      return (
        <div className="space-y-1">
          <div className="font-mono text-lg">{pct}%</div>
          <div className="h-1 w-full rounded-full bg-background/60">
            <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
        </div>
      );
    }
    if (w.kind === "prompt")
      return (
        <button
          onClick={() => onSeedChat?.(w.seed ?? w.title)}
          className="rounded-full border border-primary/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/15 transition"
        >
          Ejecutar
        </button>
      );
    return <div className="text-sm text-muted-foreground">{w.text}</div>;
  };

  return (
    <div className="rounded-xl border p-3 bg-card/40" style={{ borderColor: `color-mix(in oklab, ${accent} 40%, transparent)` }}>
      <div className="text-[9px] uppercase tracking-[0.25em] mb-1.5" style={{ color: accent }}>{w.title}</div>
      {body()}
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="font-mono text-2xl">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>;
}

function WidgetsTab() {
  const { persona, update } = usePersona();
  const gen = useServerFn(generateWidget);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (prompt.trim().length < 2) return;
    setBusy(true);
    try {
      const { widget } = await gen({ data: { prompt: prompt.trim() } });
      update({ widgets: [...persona.widgets, widget as CustomWidget].slice(-12) });
      setPrompt("");
      toast.success(`Widget "${widget.title}" creado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el widget");
    } finally {
      setBusy(false);
    }
  };

  const addManual = () =>
    update({
      widgets: [
        ...persona.widgets,
        { id: `w-${Date.now().toString(36)}`, title: "Nota", kind: "note", text: "Escribe algo…" },
      ],
    });

  return (
    <div className="space-y-4">
      <Label>Widgets personalizados</Label>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="ej. contador de tareas pendientes, reloj de misión, frase diaria…"
          className="flex-1 rounded-md border border-primary/30 bg-card/50 px-3 py-2 text-sm"
        />
        <button
          onClick={create}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/25 transition"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generar
        </button>
        <button
          onClick={addManual}
          className="rounded-full border border-primary/30 px-3 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/10 transition"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {persona.widgets.map((w) => (
          <div key={w.id} className="flex items-center gap-2 rounded-lg border border-primary/25 bg-card/40 px-3 py-2">
            <input
              value={w.title}
              onChange={(e) =>
                update({ widgets: persona.widgets.map((x) => (x.id === w.id ? { ...x, title: e.target.value } : x)) })
              }
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px]">{w.kind}</span>
            <button
              onClick={() => update({ widgets: persona.widgets.filter((x) => x.id !== w.id) })}
              className="text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <Label>Vista previa</Label>
        <CustomWidgets />
      </div>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">{children}</div>
  );
}

function Chips({
  label, options, value, onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              value === o.id ? "border-primary bg-primary/20" : "border-primary/30 bg-card/40 hover:bg-primary/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PersonalizationPanel({ assistant = "nova" }: { assistant?: "nova" | "nevira" }) {
  const [tab, setTab] = useState<"personalidad" | "apariencia" | "widgets">("personalidad");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] font-mono">
        {(["personalidad", "apariencia", "widgets"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full border transition ${
              tab === t ? "border-primary bg-primary/25 glow-text" : "border-primary/30 bg-card/40 hover:bg-primary/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "personalidad" && <PersonalityTab />}
      {tab === "apariencia" && <AppearanceTab assistant={assistant} />}
      {tab === "widgets" && <WidgetsTab />}
    </div>
  );
}
