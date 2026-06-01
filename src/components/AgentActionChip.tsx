import { useState } from "react";
import { ChevronDown, Code2, Search, Sparkles, Wrench, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentAction {
  tool: string;
  ok: boolean;
  summary: string;
  args?: unknown;
}

function iconFor(tool: string) {
  if (tool === "web_search") return Search;
  if (tool === "run_code") return Code2;
  if (tool === "save_skill") return Sparkles;
  return Wrench;
}

export function AgentActionChip({ action }: { action: AgentAction }) {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(action.tool);
  const Status = action.ok ? CheckCircle2 : XCircle;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {action.tool}
        </span>
        <span className="flex-1 truncate text-foreground/90">{action.summary}</span>
        <Status
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            action.ok ? "text-primary" : "text-destructive",
          )}
        />
        <ChevronDown
          className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && action.args !== undefined && (
        <pre className="max-h-40 overflow-auto border-t border-border/40 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {JSON.stringify(action.args, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function AgentActionList({ actions }: { actions: AgentAction[] }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className="mb-2 space-y-1">
      {actions.map((a, i) => (
        <AgentActionChip key={i} action={a} />
      ))}
    </div>
  );
}
