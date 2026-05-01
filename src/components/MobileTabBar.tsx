import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessagesSquare, Image as ImageIcon, Music, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  onMenu: () => void;
}

const TABS = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/chat", label: "Chat", icon: MessagesSquare },
  { to: "/gallery", label: "Galería", icon: ImageIcon },
] as const;

/**
 * Barra inferior de navegación visible en móvil/tablet. En desktop se oculta
 * porque el Sidebar lateral cubre la navegación.
 */
export function MobileTabBar({ onMenu }: MobileTabBarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 lg:hidden",
        "border-t border-border bg-background/85 backdrop-blur-xl",
      )}
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active = pathname === t.to || (t.to !== "/" && pathname.startsWith(t.to));
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
              <span>{t.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            // Quick: si estamos en chat → abrir menú vía deeplink no aplica; usamos onMenu
            onMenu();
          }}
          className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
          aria-label="Música"
        >
          <Music className="h-5 w-5" />
          <span>Música</span>
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
          aria-label="Menú"
        >
          <Menu className="h-5 w-5" />
          <span>Menú</span>
        </button>
      </div>
    </nav>
  );
}
