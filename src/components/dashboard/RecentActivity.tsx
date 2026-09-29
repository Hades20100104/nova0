import { Image as ImageIcon, FileText, MessageSquare, Sparkles, ArrowUpRight } from "lucide-react";

const ITEMS = [
  {
    icon: ImageIcon,
    label: "Imagen creada",
    detail: "nebula_concept_04.png",
    time: "Hace 2 min",
    tag: "Visual",
  },
  {
    icon: FileText,
    label: "Documento actualizado",
    detail: "Brief campaña · v3",
    time: "Hace 1 h",
    tag: "Doc",
  },
  {
    icon: MessageSquare,
    label: "Conversación con NOVA",
    detail: "Ideas para el lanzamiento",
    time: "Hace 2 h",
    tag: "Chat",
  },
];

export function RecentActivity() {
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

      <ul className="space-y-1.5">
        {ITEMS.map((it, idx) => {
          const Icon = it.icon;
          return (
            <li
              key={it.label}
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
                    {it.tag}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{it.detail}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] text-muted-foreground font-mono">{it.time}</span>
                <ArrowUpRight className="h-3 w-3 text-primary/70 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
