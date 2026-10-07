import {
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  CheckSquare,
  Workflow,
  Brain,
  FolderKanban,
  Bot,
} from "lucide-react";
import { useRecentActivity, relativeTime, type ActivityKind } from "@/lib/activity-data";

const META: Record<ActivityKind, { icon: typeof ImageIcon; tag: string }> = {
  message: { icon: MessageSquare, tag: "Chat" },
  image: { icon: ImageIcon, tag: "Visual" },
  document: { icon: FileText, tag: "Doc" },
  task: { icon: CheckSquare, tag: "Tarea" },
  automation: { icon: Workflow, tag: "Auto" },
  memory: { icon: Brain, tag: "Memoria" },
  project: { icon: FolderKanban, tag: "Proyecto" },
  ai: { icon: Bot, tag: "IA" },
};

export function RecentActivity() {
  const { data: items = [], isLoading, error } = useRecentActivity(6);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-xl p-3"
      style={{
        boxShadow:
          "0 0 30px color-mix(in oklab, var(--glow) 18%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 15%, transparent)",
      }}
    >
      {/* corner ticks */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-2 w-2 border-l border-t border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 border-r border-t border-primary/60" />
      <span className="pointer-events-none absolute left-1.5 bottom-1.5 h-2 w-2 border-l border-b border-primary/60" />
      <span className="pointer-events-none absolute right-1.5 bottom-1.5 h-2 w-2 border-r border-b border-primary/60" />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--glow))" }} />
          <span className="text-sm font-display glow-text">Actividad reciente</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ boxShadow: "0 0 8px var(--glow)" }} />
          Live
        </span>
      </div>

      {isLoading && <p className="text-[10px] text-muted-foreground p-2">Cargando actividad…</p>}
      {error && <p className="text-[10px] text-destructive p-2">No se pudo cargar la actividad.</p>}
      {!isLoading && !error && items.length === 0 && (
        <p className="text-[10px] text-muted-foreground p-2">Aún no hay actividad. Empieza una conversación.</p>
      )}
      <ul className="space-y-1.5">
        {items.map((it, idx) => {
          const { icon: Icon, tag } = META[it.kind];
          return (
            <li
              key={it.id}
              className="group relative flex items-center gap-2.5 rounded-lg border border-border/40 bg-background/30 p-2 hover:border-primary/60 hover:bg-primary/5 transition fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <span
                className="relative grid h-8 w-8 place-items-center rounded-md border border-primary/40"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--primary) 25%, transparent), color-mix(in oklab, var(--accent) 18%, transparent))",
                  boxShadow: "0 0 10px color-mix(in oklab, var(--glow) 45%, transparent)",
                }}
              >
                <Icon className="h-3.5 w-3.5 text-foreground" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{it.label}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.2em] px-1 py-px rounded border border-primary/30 text-primary/90">
                    {tag}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{it.detail}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] text-muted-foreground font-mono">{relativeTime(it.at)}</span>
                <ArrowUpRight className="h-3 w-3 text-primary/70 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
