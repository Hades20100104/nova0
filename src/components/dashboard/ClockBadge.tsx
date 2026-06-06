import { useEffect, useState } from "react";
import { Search, LayoutGrid, ChevronRight } from "lucide-react";

export function ClockBadge() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = now ? now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const date = now ? now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="flex items-center gap-2">
      <button className="grid h-9 w-9 place-items-center rounded-lg border border-border/40 bg-card/40 backdrop-blur hover:bg-primary/15 transition">
        <Search className="h-4 w-4 text-foreground/80" />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-lg border border-border/40 bg-card/40 backdrop-blur hover:bg-primary/15 transition">
        <LayoutGrid className="h-4 w-4 text-foreground/80" />
      </button>
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 backdrop-blur px-3 py-1.5">
        <div className="text-right leading-tight">
          <div className="font-display text-lg glow-text" suppressHydrationWarning>{time}</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground" suppressHydrationWarning>{date}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}
