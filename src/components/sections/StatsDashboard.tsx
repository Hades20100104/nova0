import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Clock, CheckCircle2, Zap, Timer, Target, Gauge, Brain, HardDrive, Hash, Loader2, EyeOff, Sparkles,
} from "lucide-react";
import { useDeepStats, useUsageMinutes } from "@/lib/stats-data";
import { useLivePerf } from "@/lib/module-stats";
import { describeUserMirror } from "@/lib/personalize.functions";

function fmtHours(min: number) {
  if (min < 60) return `${min} min`;
  return `${(min / 60).toFixed(1)} h`;
}

function Tile({
  icon: Icon, label, value, sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-primary/80 font-mono">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 font-mono text-2xl glow-text">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Meter({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary">{value}%{sub ? ` · ${sub}` : ""}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-background/60">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-primary/60 to-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, boxShadow: "0 0 10px var(--glow)" }}
        />
      </div>
    </div>
  );
}

/** Hidden "how the app sees you" profile. Unlocked with 3 clicks on the sigil. */
function MirrorPanel({ summary }: { summary: string }) {
  const [taps, setTaps] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const describe = useServerFn(describeUserMirror);
  const unlocked = taps >= 3;

  const run = async () => {
    setBusy(true);
    try {
      const res = await describe({ data: { summary } });
      setText(res.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el perfil");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setTaps((t) => t + 1)}
        aria-label="Función oculta"
        className="text-[10px] uppercase tracking-[0.3em] font-mono text-muted-foreground/50 hover:text-primary transition"
      >
        {unlocked ? "◆ protocolo espejo desbloqueado" : "◇"}
      </button>

      {unlocked && (
        <div className="mt-2 rounded-xl border border-primary/30 bg-card/40 p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono text-primary">
            <EyeOff className="h-3.5 w-3.5" /> Protocolo espejo
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Retrato generado a partir de tu actividad. Es una interpretación con humor: no te lo tomes personal.
          </p>
          {text ? (
            <p className="mt-3 text-sm leading-relaxed">{text}</p>
          ) : (
            <button
              onClick={run}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/25 transition"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              ¿Quién cree la app que soy?
            </button>
          )}
          {text && (
            <button
              onClick={run}
              disabled={busy}
              className="mt-3 rounded-full border border-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono hover:bg-primary/10 transition"
            >
              Regenerar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function StatsDashboard() {
  const { data: s, isLoading } = useDeepStats();
  const usage = useUsageMinutes();
  const perf = useLivePerf();

  if (isLoading || !s) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando estadísticas…
      </div>
    );
  }

  const goalPct = s.goalsTotal ? Math.round((s.goalsDone / s.goalsTotal) * 100) : 0;
  const autoPct = s.automationsTotal ? Math.round((s.automationsRun / s.automationsTotal) * 100) : 0;
  const perfScore = Math.max(0, Math.min(100, Math.round((perf.fps / 60) * 100 - perf.memPct / 4)));

  const summary = [
    `Tareas completadas: ${s.tasksDone}, pendientes: ${s.tasksOpen}`,
    `Objetivos alcanzados: ${s.goalsDone}/${s.goalsTotal}`,
    `Automatizaciones ejecutadas: ${s.automationsRun} de ${s.automationsTotal}`,
    `Horas ahorradas estimadas: ${(s.savedMinutes / 60).toFixed(1)}`,
    `Tiempo de uso (sesiones de foco): ${s.focusMinutes} min; app abierta: ${usage} min`,
    `Recuerdos guardados: ${s.memoryCount} (${s.memoryHits} recuperaciones)`,
    `Imágenes: ${s.imagesTotal}, documentos: ${s.docsTotal}`,
    `Precisión de insights: ${s.accuracy}%`,
    `Temas más consultados: ${s.topTopics.map((t) => `${t.word} (${t.count})`).join(", ") || "sin datos"}`,
    `Módulos más usados: ${s.topModules.map((m) => `${m.module} (${m.count})`).join(", ") || "sin datos"}`,
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={Clock} label="Horas ahorradas" value={fmtHours(s.savedMinutes)} sub="estimación por delegación" />
        <Tile icon={CheckCircle2} label="Tareas completadas" value={s.tasksDone} sub={`${s.tasksOpen} pendientes`} />
        <Tile icon={Zap} label="Automatizaciones" value={s.automationsRun} sub={`${s.automationsActive} activas`} />
        <Tile icon={Timer} label="Tiempo de uso" value={fmtHours(usage + s.focusMinutes)} sub={`${s.focusMinutes} min en foco`} />
        <Tile icon={Target} label="Objetivos alcanzados" value={`${s.goalsDone}/${s.goalsTotal}`} />
        <Tile icon={Brain} label="Precisión" value={`${s.accuracy}%`} sub="confianza media de insights" />
        <Tile icon={Gauge} label="Rendimiento" value={`${perf.fps} fps`} sub={`${perf.cores} núcleos`} />
        <Tile icon={HardDrive} label="Memoria utilizada" value={perf.memMB ? `${perf.memMB} MB` : `${s.memoryCount} items`} sub={perf.heapLimitMB ? `${perf.memPct}% del heap` : `${s.memoryHits} recuperaciones`} />
      </div>

      <div className="rounded-xl border border-primary/30 bg-card/40 p-4 space-y-3">
        <Meter label="Objetivos" value={goalPct} />
        <Meter label="Cobertura de automatización" value={autoPct} />
        <Meter label="Precisión del sistema" value={s.accuracy} />
        <Meter label="Rendimiento del cliente" value={perfScore} sub={`${perf.memPct}% RAM`} />
      </div>

      <div className="rounded-xl border border-primary/30 bg-card/40 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono text-primary/80">
          <Hash className="h-3.5 w-3.5" /> Temas más consultados
        </div>
        {s.topTopics.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {s.topTopics.map((t) => (
              <span
                key={t.word}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs"
                style={{ fontSize: `${11 + Math.min(6, t.count)}px` }}
              >
                {t.word} <span className="text-muted-foreground font-mono">{t.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Aún no hay suficientes conversaciones para extraer temas.</p>
        )}
        {s.topModules.length > 0 && (
          <div className="mt-3 space-y-2">
            {s.topModules.map((m) => (
              <Meter key={m.module} label={m.module} value={Math.round((m.count / s.topModules[0].count) * 100)} sub={`${m.count}`} />
            ))}
          </div>
        )}
      </div>

      <MirrorPanel summary={summary} />
    </div>
  );
}
