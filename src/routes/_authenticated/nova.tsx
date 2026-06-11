import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { NovaSphereClient } from "@/components/NovaSphereClient";
import { ModuleSidebar } from "@/components/dashboard/ModuleSidebar";
import { ClockBadge } from "@/components/dashboard/ClockBadge";
import { LiquidChatBar } from "@/components/dashboard/LiquidChatBar";
import { InlineChatPanel } from "@/components/dashboard/InlineChatPanel";
import { NovaSection } from "@/components/sections/ModuleSections";
import { getModule } from "@/lib/modules";
import { useTheme, novaThemeClass, fontClass } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ArrowLeft, Menu } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nova")({
  head: () => ({ meta: [{ title: "NOVA — IA Creativa" }] }),
  component: NovaHome,
});

function NovaHome() {
  const create = useServerFn(createThread);
  const [module, setModule] = useState("home");
  const [navOpen, setNavOpen] = useState(false);
  const [inlineThread, setInlineThread] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleSelect = useCallback((slug: string) => {
    setModule(slug);
    setNavOpen(false);
  }, []);

  const startChat = async (slug = module, firstMessage?: string) => {
    try {
      const title = firstMessage ? firstMessage.slice(0, 60) : `NOVA · ${slug}`;
      const res = await create({ data: { assistant: "nova", module: slug, title } });
      const id = res.thread!.id;
      if (firstMessage && typeof window !== "undefined") {
        window.sessionStorage.setItem(`pending-msg:${id}`, firstMessage);
      }
      setInlineThread(id);
    } catch (e) { console.error(e); }
  };

  const submit = (text: string) => startChat(module, text);

  const showSection = module !== "home";
  const { prefs } = useTheme();
  const themeClass = `${novaThemeClass(prefs.nova)} ${fontClass(prefs.font)}`;

  return (
    <div className={`nova-bg theme-transition ${themeClass} flex h-[100dvh] w-screen overflow-hidden`}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <ModuleSidebar assistant="nova" active={module} onSelect={handleSelect} />
      </div>

      {/* Mobile sidebar in sheet */}
      {isMobile && (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="p-0 w-[86vw] max-w-sm border-r border-border/40 bg-transparent">
            <ModuleSidebar assistant="nova" active={module} onSelect={handleSelect} />
          </SheetContent>
        </Sheet>
      )}

      <main className="relative flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/30">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setNavOpen(true)}
              className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition shrink-0"
              title="Menú"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
            {showSection && (
              <button
                onClick={() => setModule("home")}
                className="grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition shrink-0"
                title="Volver al inicio"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-xl md:text-2xl tracking-[0.3em] glow-text truncate">NOVA</h1>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground truncate">
                {showSection ? getModule("nova", module).label : "IA Creativa · Consciente · Inspiradora"}
              </p>
            </div>
          </div>
          <ClockBadge />
        </header>

        {/* Stage: sphere stays mounted; section overlays when active */}
        <div className="relative flex-1 overflow-hidden min-h-[280px]">
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              opacity: showSection ? 0 : 1,
              pointerEvents: showSection ? "none" : "auto",
            }}
          >
            <NovaSphereClient onSelect={handleSelect} active={module} />
          </div>
          {showSection && (
            <div key={module} className="absolute inset-0 overflow-y-auto p-4 md:p-6 animate-fade-in">
              <NovaSection slug={module} onChat={() => startChat(module)} />
            </div>
          )}
          {inlineThread && (
            <InlineChatPanel
              assistant="nova"
              threadId={inlineThread}
              module={module}
              onClose={() => setInlineThread(null)}
            />
          )}
        </div>

        <LiquidChatBar assistant="nova" onSubmit={submit} />
      </main>
    </div>
  );
}
