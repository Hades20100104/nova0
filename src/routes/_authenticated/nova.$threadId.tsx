import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getThread, updateThreadModule } from "@/lib/threads.functions";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { AssistantChat } from "@/components/AssistantChat";
import { NovaSphereClient } from "@/components/NovaSphereClient";
import { HudTelemetry } from "@/components/HudTelemetry";
import { NOVA_MODULES, getModule } from "@/lib/modules";
import type { UIMessage } from "ai";
import novaLogo from "@/assets/nova-logo.png";

export const Route = createFileRoute("/_authenticated/nova/$threadId")({
  component: NovaThread,
});

function NovaThread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const fetchThread = useServerFn(getThread);
  const updateMod = useServerFn(updateThreadModule);
  const [initial, setInitial] = useState<UIMessage[]>([]);
  const [module, setModule] = useState("home");
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
      .catch(() => navigate({ to: "/nova" }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [threadId, fetchThread, navigate]);

  const handleSelect = async (slug: string) => {
    setModule(slug);
    try { await updateMod({ data: { threadId, module: slug } }); } catch {}
  };

  return (
    <div className="nova-bg flex h-screen w-screen overflow-hidden">
      <ThreadSidebar assistant="nova" activeThreadId={threadId} module={module} />
      <main className="relative flex flex-1 flex-col lg:flex-row">
        <div className="relative lg:w-[45%] h-[40vh] lg:h-full border-r border-border/30">
          <HudTelemetry variant="nova" />
          <NovaSphereClient onSelect={handleSelect} active={module} />
          <div className="absolute top-10 left-4 flex items-center gap-2 pointer-events-none">
            <img src={novaLogo} alt="" width={32} height={32} className="drop-shadow-[0_0_18px_var(--glow)]" />
            <span className="font-display text-lg tracking-[0.3em] glow-text">NOVA</span>
          </div>
          {/* Module chips overlay */}
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 px-4">
            <div className="flex flex-wrap justify-center gap-1.5 pointer-events-auto">
              {NOVA_MODULES.slice(0, 8).map((m) => {
                const Icon = m.icon;
                const isActive = module === m.slug;
                return (
                  <button
                    key={m.slug}
                    onClick={() => handleSelect(m.slug)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] backdrop-blur transition ${
                      isActive ? "border-primary bg-primary/25" : "border-primary/30 bg-card/30 hover:bg-primary/15"
                    }`}
                  >
                    <Icon className="h-3 w-3" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Section breadcrumb */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-border/30 bg-background/40 backdrop-blur">
            {(() => { const M = getModule("nova", module); const Icon = M.icon; return (
              <>
                <Icon className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--glow))" }} />
                <div>
                  <div className="font-display tracking-wide">{M.label}</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{M.description}</div>
                </div>
              </>
            ); })()}
          </div>
          {!loading && (
            <AssistantChat
              assistant="nova"
              threadId={threadId}
              module={module}
              initialMessages={initial}
              emptyHint="¿Qué deseas crear hoy?"
            />
          )}
        </div>
      </main>
    </div>
  );
}
