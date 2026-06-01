import { cn } from "@/lib/utils";
import { Search, Code2, Sparkles, Wrench, CheckCircle2, AlertCircle } from "lucide-react";

interface AgentTrace {
  summary: string;
  ok: boolean;
  tool?: string;
}

function iconFor(summary: string) {
  if (summary.includes("web_search") || summary.includes("🔎")) return Search;
  if (summary.includes("run_code") || summary.includes("⚙️")) return Code2;
  if (summary.includes("save_skill") || summary.includes("💾")) return Sparkles;
  if (summary.includes("skill_") || summary.includes("🧠")) return Sparkles;
  return Wrench;
}

export function AgentActionChip({ trace }: { trace: AgentTrace }) {
  const Icon = iconFor(trace.summary);
  // Strip leading emoji from summary if present (we render our own icon).
  const text = trace.summary.replace(/^[^\w]+/, "").trim() || trace.summary;
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        trace.ok
          ? "border-primary/30 bg-primary/10 text-foreground/80"
          : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{text}</span>
      {trace.ok ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 opacity-60" />
      ) : (
        <AlertCircle className="h-3 w-3 shrink-0" />
      )}
    </div>
  );
}

export function AgentActionTrace({ trace }: { trace: AgentTrace[] }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {trace.map((t, i) => (
        <AgentActionChip key={i} trace={t} />
      ))}
    </div>
  );
}
