import { Home, Music, FileText, Bell, Calendar, LayoutGrid, BarChart3, Wallet, Settings, Headphones, MessagesSquare, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  themeName: "NEVIRA" | "NOVA";
  userName: string | null;
  active: string;
  onSelect: (key: string) => void;
}

const ITEMS = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "music", label: "Música", icon: Music },
  { key: "images", label: "Imágenes", icon: ImageIcon },
  { key: "documents", label: "Documentos", icon: FileText },
  { key: "reminders", label: "Recordatorios", icon: Bell },
  { key: "calendar", label: "Calendario", icon: Calendar },
  { key: "apps", label: "Apps", icon: LayoutGrid },
  { key: "chat", label: "Conversación", icon: MessagesSquare },
  { key: "analytics", label: "Analítica", icon: BarChart3 },
  { key: "finance", label: "Finanzas", icon: Wallet },
  { key: "settings", label: "Ajustes", icon: Settings },
];

export function AppSidebar({ themeName, userName, active, onSelect }: AppSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-primary-foreground">
            <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 22 L10.5 12.5 L3 11 L10.5 9.5 Z" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-bold tracking-[0.2em]">{themeName}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {themeName === "NOVA" ? "Ultra Intelligence" : "Asistente diario"}
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/40 shadow-glow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tarjeta premium */}
      <div className="rounded-xl border border-primary/40 bg-card/40 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest">{themeName} PRIME</span>
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_currentColor]" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {themeName === "NOVA" ? "Inteligencia sin límites" : "Tu asistente para cada momento"}
        </p>
        <button className="mt-3 text-xs font-semibold text-primary hover:underline">
          Gestionar →
        </button>
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/30 p-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
          {(userName ?? "U")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{userName ?? "Usuario"}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuenta activa</div>
        </div>
        <Headphones className="h-4 w-4 text-muted-foreground" />
      </div>
    </aside>
  );
}
