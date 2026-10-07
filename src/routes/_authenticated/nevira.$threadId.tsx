import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getThread, updateThreadModule } from "@/lib/threads.functions";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { AssistantChat } from "@/components/AssistantChat";
import { NEVIRA_MODULES, getModule } from "@/lib/modules";
import { HudTelemetry } from "@/components/HudTelemetry";
import type { UIMessage } from "ai";
import neviraLogo from "@/assets/nevira-logo.png";

export const Route = createFileRoute("/_authenticated/nevira/$threadId")({
  component: NeviraThread,
});

function NeviraThread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const fetchThread = useServerFn(getThread);
  const updateMod = useServerFn(updateThreadModule);
  const [initial, setInitial] = useState<UIMessage[]>([]);
  const [module, setModule] = useState("panel");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchThread({ data: { threadId } })
      .then((res) => {
        if (cancelled) return;
        setModule(res.thread.module);
        setInitial(
          (res.messages ?? []).map((m: { id: string; role: string; parts: unknown }) => ({
            id: m.id,
            role: m.role as UIMessage["role"],
            parts: m.parts as UIMessage["parts"],
          })),
        );
      })
      .catch(() => navigate({ to: "/nevira" }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [threadId, fetchThread, navigate]);

  const handleSelect = async (slug: string) => {
    setModule(slug);
    try { await updateMod({ data: { threadId, module: slug } }); } catch {}
  };

  const activeMod = getModule("nevira", module);
  const ActiveIcon = activeMod.icon;

  return (
    <div className="theme-nevira nevira-bg flex h-screen w-screen overflow-hidden">
      <ThreadSidebar assistant="nevira" activeThreadId={threadId} module={module} />
      <main className="relative flex flex-1 min-w-0">
        <HudTelemetry variant="nevira" />
        {/* Module rail */}
        <div className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-border/30 p-3 pt-12 overflow-y-auto bg-background/30 backdrop-blur">
          <div className="flex items-center gap-2 mb-1 px-2">
            <img src={neviraLogo} alt="" width={28} height={28} />
            <span className="font-display tracking-[0.25em] glow-text">NEVIRA</span>
          </div>
          <div className="px-2 mb-3 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">// módulos</div>
          {NEVIRA_MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = module === m.slug;
            return (
              <button key={m.slug} onClick={() => handleSelect(m.slug)}
                className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition font-mono ${
                  isActive
                    ? "bg-primary/20 text-foreground border border-primary/50 glow-ring"
                    : "border border-transparent hover:bg-primary/10 hover:border-primary/30 text-foreground/80"
                }`}>
                <Icon className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate text-[12px] uppercase tracking-wider">{m.label}</span>
                {isActive && <span className="text-primary text-xs">›</span>}
              </button>
            );
          })}
          <div className="mt-auto pt-4 border-t border-border/30 px-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
            <div>Build · 2026.05</div>
            <div className="text-emerald-400 mt-1">● Conectado</div>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0 pt-10">
          <div className="flex items-center gap-3 px-6 py-3 border-b border-border/30 bg-background/40 backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">SYS ›</div>
            <ActiveIcon className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--glow))" }} />
            <div>
              <div className="font-display tracking-wide">{activeMod.label}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">{activeMod.description}</div>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Canal seguro
            </div>
          </div>
          {!loading && (
            <AssistantChat
              assistant="nevira"
              threadId={threadId}
              module={module}
              initialMessages={initial}
              emptyHint={`Consulta a NEVIRA en modo ${activeMod.label}`}
            />
          )}
        </div>
      </main>
    </div>
  );
}
