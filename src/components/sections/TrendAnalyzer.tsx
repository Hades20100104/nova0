import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { runTopicAnalysis } from "@/lib/analysis.functions";

type Focus = "trend" | "person" | "brand" | "event";

const FOCUS_LABELS: Record<Focus, string> = {
  trend: "Tendencia",
  person: "Persona",
  brand: "Marca",
  event: "Evento",
};

export function TrendAnalyzer() {
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState<Focus>("trend");
  const fn = useServerFn(runTopicAnalysis);

  const run = useMutation({
    mutationFn: async () => fn({ data: { topic: topic.trim(), focus } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const data = run.data;
  const maxCount = Math.max(1, ...(data?.timeline ?? []).map((t) => t.count));

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-xl p-4 space-y-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
        Oráculo · análisis del mundo
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFocus(f)}
            className={`rounded-lg border px-3 py-1 text-[10px] uppercase tracking-widest transition ${
              focus === f
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-primary/25 text-muted-foreground hover:text-primary"
            }`}
          >
            {FOCUS_LABELS[f]}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (topic.trim().length > 1) run.mutate();
        }}
      >
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Analiza un tema, tendencia o persona pública…"
          aria-label="Tema a analizar"
          className="flex-1 bg-transparent border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <button
          type="submit"
          disabled={run.isPending || topic.trim().length < 2}
          className="rounded-xl border border-primary/50 bg-primary/15 px-4 text-primary disabled:opacity-40"
          aria-label="Analizar"
        >
          {run.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>

      {run.isPending && (
        <p className="text-xs text-muted-foreground">
          Rastreando web, Reddit y X sobre “{topic}”…
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4 rounded-xl border border-primary/25 bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Sentimiento
              </div>
              <div className="text-3xl font-display glow-text mt-1">{data.sentiment}%</div>
              <div className="mt-2 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${data.sentiment}%` }} />
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                {data.web.length} web · {data.reddit.length} reddit · {data.x.length} X
              </div>
              {data.xError && (
                <p className="mt-2 text-[10px] text-muted-foreground">{data.xError}</p>
              )}
            </div>

            <div className="col-span-12 md:col-span-8 rounded-xl border border-primary/25 bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Menciones por día
              </div>
              {data.timeline.length ? (
                <div className="flex items-end gap-1 h-24">
                  {data.timeline.map((t) => (
                    <div key={t.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{ height: `${(t.count / maxCount) * 100}%` }}
                        title={`${t.day}: ${t.count}`}
                      />
                      <span className="text-[8px] text-muted-foreground">{t.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin datos temporales suficientes.</p>
              )}
            </div>
          </div>

          {data.report && (
            <div className="rounded-xl border border-primary/25 bg-card/40 p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {data.report}
            </div>
          )}

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
                Fuentes web
              </div>
              {data.web.map((w) => (
                <a
                  key={w.url}
                  href={w.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block rounded-lg border border-primary/20 bg-card/40 px-3 py-2 hover:border-primary/50 transition"
                >
                  <div className="text-xs flex items-center gap-1">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{w.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {w.snippet}
                  </p>
                </a>
              ))}
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
                Conversación social
              </div>
              {data.reddit.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block rounded-lg border border-primary/20 bg-card/40 px-3 py-2 hover:border-primary/50 transition"
                >
                  <div className="text-[10px] font-mono text-primary/80">
                    r/{r.subreddit} · {r.ups}↑
                  </div>
                  <div className="text-xs truncate">{r.title}</div>
                </a>
              ))}
              {data.x.map((p) => (
                <a
                  key={p.url || p.text.slice(0, 20)}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block rounded-lg border border-primary/20 bg-card/40 px-3 py-2 hover:border-primary/50 transition"
                >
                  <div className="text-[10px] font-mono text-primary/80">{p.author}</div>
                  <div className="text-xs line-clamp-2">{p.text}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
