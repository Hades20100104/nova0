import {
  DollarSign,
  Calendar,
  Users,
  Search,
  Music,
  Image as ImageIcon,
  FileText,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: typeof Music;
  label: string;
  prompt: string;
}

const ACTIONS: QuickAction[] = [
  {
    icon: Music,
    label: "Reproducir música",
    prompt: "Recomiéndame música según mi estado de ánimo",
  },
  { icon: ImageIcon, label: "Generar imagen", prompt: "Genera una imagen de " },
  { icon: Bell, label: "Crear recordatorio", prompt: "Recuérdame " },
  { icon: Search, label: "Buscar en Google", prompt: "Busca en Google: " },
  { icon: FileText, label: "Analizar archivo", prompt: "Quiero analizar un documento" },
  { icon: Calendar, label: "Agenda mi día", prompt: "Ayúdame a organizar mi día" },
  { icon: DollarSign, label: "Finanzas", prompt: "Analiza mis finanzas" },
  { icon: Users, label: "Prepara reunión", prompt: "Prepara una reunión sobre " },
];

interface QuickActionsProps {
  onPick: (prompt: string) => void;
}

export function QuickActions({ onPick }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={() => onPick(a.prompt)}
            className={cn(
              "glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium",
              "hover:border-primary/60 hover:bg-card/80 transition-all",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
