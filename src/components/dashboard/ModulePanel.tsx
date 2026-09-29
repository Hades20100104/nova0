import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";

export function ModulePanel({
  title,
  icon: Icon,
  items,
  cta = "Ver módulo",
  onClick,
  align = "left",
}: {
  title: string;
  icon: LucideIcon;
  items: { label: string; value?: string | number }[];
  cta?: string;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-lg border border-primary/30 bg-card/40 backdrop-blur-md p-3 transition hover:border-primary hover:bg-primary/10"
      style={{ boxShadow: "0 0 24px color-mix(in oklab, var(--glow) 18%, transparent), inset 0 0 18px color-mix(in oklab, var(--glow) 8%, transparent)" }}
    >
      {/* corner ticks */}
      <span className="absolute top-1 left-1 h-2 w-2 border-t border-l border-primary/70" />
      <span className="absolute top-1 right-1 h-2 w-2 border-t border-r border-primary/70" />
      <span className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-primary/70" />
      <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-primary/70" />

      <div className={`mb-2 flex items-center gap-2 ${align === "right" ? "justify-end flex-row-reverse" : ""}`}>
        <Icon className="h-3.5 w-3.5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--glow))" }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/90">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-[11px]">
            <Check className="h-3 w-3 text-primary/80" />
            <span className="flex-1 truncate text-foreground/85">{it.label}</span>
            {it.value !== undefined && (
              <span className="font-mono text-[10px] text-primary">{it.value}</span>
            )}
          </li>
        ))}
      </ul>
      <div className={`mt-2 flex items-center gap-1 text-[10px] text-primary/80 group-hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {cta} <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}
