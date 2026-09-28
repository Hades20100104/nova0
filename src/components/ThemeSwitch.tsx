import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSwitchProps {
  theme: "nevira" | "nova";
  onChange: (theme: "nevira" | "nova") => void;
  className?: string;
}

/**
 * Switch NEVIRA (día) ↔ NOVA (noche).
 */
export function ThemeSwitch({ theme, onChange, className }: ThemeSwitchProps) {
  const isNova = theme === "nova";
  return (
    <button
      type="button"
      onClick={() => onChange(isNova ? "nevira" : "nova")}
      className={cn(
        "group relative flex h-10 w-32 items-center rounded-full border border-border bg-card/50 backdrop-blur transition-all hover:border-primary/60",
        className
      )}
      aria-label={`Cambiar a modo ${isNova ? "NEVIRA (día)" : "NOVA (noche)"}`}
    >
      <div
        className={cn(
          "absolute top-1 h-8 w-[60px] rounded-full bg-gradient-to-r from-primary to-primary-glow shadow-glow transition-all duration-500",
          isNova ? "left-[66px]" : "left-1"
        )}
      />
      <span
        className={cn(
          "relative z-10 flex h-full w-1/2 items-center justify-center gap-1 text-xs font-semibold tracking-wider transition-colors",
          !isNova ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        DÍA
      </span>
      <span
        className={cn(
          "relative z-10 flex h-full w-1/2 items-center justify-center gap-1 text-xs font-semibold tracking-wider transition-colors",
          isNova ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        NOCHE
      </span>
    </button>
  );
}
