import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Sparkles } from "lucide-react";
import type { Block, Layout } from "@/lib/section-blocks";
import { useSectionSource } from "@/hooks/use-user-sections";

/* ---------- Blocks ---------- */

function StatBlock({ block }: { block: Extract<Block, { type: "stat" }> }) {
  const q = useSectionSource(block.source);
  const value = q.data?.kind === "count" ? String(q.data.value) : "—";
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-4">
      <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        {block.title}
      </div>
      <div className="mt-1 text-2xl font-display glow-text">
        {q.isLoading ? "…" : value}
      </div>
    </div>
  );
}

function ListBlock({ block }: { block: Extract<Block, { type: "list" }> }) {
  const q = useSectionSource(block.source, { limit: block.limit });
  const items = q.data?.kind === "list" ? q.data.items : [];
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-3">
        {block.title}
      </div>
      {q.isLoading && <div className="text-xs text-muted-foreground">Cargando…</div>}
      {!q.isLoading && items.length === 0 && (
        <div className="text-xs text-muted-foreground">Sin datos todavía.</div>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/30 p-2">
            {it.image ? (
              <img src={it.image} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{it.title}</div>
              {it.subtitle && (
                <div className="truncate text-[10px] text-muted-foreground">{it.subtitle}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartBlock({ block }: { block: Extract<Block, { type: "chart" }> }) {
  const q = useSectionSource(block.source, { range: block.range });
  const series = q.data?.kind === "chart" ? q.data.series : [];
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-3">
        {block.title}
      </div>
      <div className="flex h-24 items-end gap-[2px]">
        {series.map((s) => (
          <div
            key={s.day}
            title={`${s.day}: ${s.value}`}
            className="flex-1 rounded-sm bg-gradient-to-t from-primary/70 to-accent/60"
            style={{ height: `${(s.value / max) * 100}%`, minHeight: "2px" }}
          />
        ))}
      </div>
    </div>
  );
}

function ActionBlock({
  block,
  onRunSkill,
}: {
  block: Extract<Block, { type: "action" }>;
  onRunSkill: (skill: string, input: Record<string, unknown>) => Promise<string>;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const out = await onRunSkill(block.skill, block.input);
      setResult(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
            Acción
          </div>
          <div className="text-sm font-medium">{block.title}</div>
          <div className="text-[10px] text-muted-foreground font-mono">skill · {block.skill}</div>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs hover:bg-primary/25 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Ejecutar
        </button>
      </div>
      {result && (
        <pre className="max-h-40 overflow-auto rounded-lg bg-background/50 p-2 text-[11px] font-mono whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}

function ChatPromptBlock({
  block,
  onSeed,
}: {
  block: Extract<Block, { type: "chat_prompt" }>;
  onSeed: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onSeed(block.seed)}
      className="w-full text-left rounded-xl border border-primary/25 bg-card/40 p-4 hover:bg-primary/10 transition"
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-1">
        {block.title}
      </div>
      <div className="text-sm">{block.seed}</div>
    </button>
  );
}

function MarkdownBlock({ block }: { block: Extract<Block, { type: "markdown" }> }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-4">
      <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
        {block.content}
      </div>
    </div>
  );
}

/* ---------- Dispatcher ---------- */

export function DynamicSection({
  layout,
  label,
  onSeedChat,
  onRunSkill,
}: {
  layout: Layout;
  label: string;
  onSeedChat: (text: string) => void;
  onRunSkill: (skill: string, input: Record<string, unknown>) => Promise<string>;
}) {
  return (
    <section className="smart-room animate-fade-in">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-mono">
          Sección personalizada
        </div>
        <h2 className="mt-1 text-2xl font-display glow-text">{label}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layout.blocks.map((b, i) => {
          switch (b.type) {
            case "stat":
              return <StatBlock key={i} block={b} />;
            case "list":
              return <ListBlock key={i} block={b} />;
            case "chart":
              return (
                <div key={i} className="md:col-span-2">
                  <ChartBlock block={b} />
                </div>
              );
            case "action":
              return <ActionBlock key={i} block={b} onRunSkill={onRunSkill} />;
            case "chat_prompt":
              return <ChatPromptBlock key={i} block={b} onSeed={onSeedChat} />;
            case "markdown":
              return (
                <div key={i} className="md:col-span-2">
                  <MarkdownBlock block={b} />
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </section>
  );
}
