import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "primary" | "muted" | "accent";
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Tarjeta de widget para el dashboard. Estilo glass con borde sutil y un ícono
 * a la izquierda del título. Si recibe `onClick` se comporta como un botón.
 */
export function DashboardCard({
  title,
  icon: Icon,
  badge,
  badgeTone = "muted",
  onClick,
  children,
  className,
}: DashboardCardProps) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group glass relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all",
        "hover:border-primary/50 hover:shadow-glow",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Halo decorativo */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
        style={{ background: "var(--gradient-orb)" }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
        {badge && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              badgeTone === "primary" && "bg-primary/20 text-primary",
              badgeTone === "accent" && "bg-accent/20 text-accent",
              badgeTone === "muted" && "bg-muted text-muted-foreground",
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="relative flex-1">{children}</div>
    </Comp>
  );
}
