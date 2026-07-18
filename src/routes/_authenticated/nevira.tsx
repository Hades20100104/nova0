import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { runSkill } from "@/lib/sections.functions";
import { NeviraCube } from "@/components/NeviraCube";
import { ModuleSidebar } from "@/components/dashboard/ModuleSidebar";
import { ModulePanel } from "@/components/dashboard/ModulePanel";
import { ClockBadge } from "@/components/dashboard/ClockBadge";
import { PerfGauge } from "@/components/dashboard/PerfGauge";
import { LiquidChatBar } from "@/components/dashboard/LiquidChatBar";
import { InlineChatPanel } from "@/components/dashboard/InlineChatPanel";
import { HudCorners } from "@/components/HudTelemetry";
import { NeviraSection } from "@/components/sections/ModuleSections";
import { DynamicSection } from "@/components/dynamic/DynamicSection";
import { useUserSections } from "@/hooks/use-user-sections";
import type { Layout } from "@/lib/section-blocks";
import { getModule } from "@/lib/modules";
import { useTheme, neviraThemeClass, fontClass } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ArrowLeft, TrendingUp, Brain, Workflow, Database, Phone, BookOpen, Shield, Menu,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/nevira")({
  head: () => ({ meta: [{ title: "NEVIRA — Sistema Operativo Inteligente" }] }),
  component: NeviraHome,
});

function NeviraHome() {
  const create = useServerFn(createThread);
  const [module, setModule] = useState("panel");
  const [navOpen, setNavOpen] = useState(false);
  const [inlineThread, setInlineThread] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const runSkillFn = useServerFn(runSkill);
  const { data: userSections = [] } = useUserSections("nevira");

  const handleSelect = useCallback((slug: string) => {
    if (slug === "section:__new__") {
      setNavOpen(false);
      window.dispatchEvent(
        new CustomEvent("assistant:send", {
          detail: { text: "Crea una sección personalizada. Pregúntame qué trackear y usa create_section." },
        }),
      );
      return;
    }
    setModule(slug);
    setNavOpen(false);
  }, []);

  const startChat = async (slug = module, firstMessage?: string) => {
    try {
      const title = firstMessage ? firstMessage.slice(0, 60) : `NEVIRA · ${slug}`;
      const res = await create({ data: { assistant: "nevira", module: slug, title } });
      const id = res.thread!.id;
      if (firstMessage && typeof window !== "undefined") {
        window.sessionStorage.setItem(`pending-msg:${id}`, firstMessage);
      }
      setInlineThread(id);
    } catch (e) { console.error(e); }
  };

  const leftPanels = [
    { slug: "productividad", title: "PRODUCTIVIDAD", icon: TrendingUp, items: [
      { label: "Tareas" }, { label: "Proyectos" }, { label: "Notas" }, { label: "Agenda" },
    ]},
    { slug: "automatizaciones", title: "AUTOMATIZACIONES", icon: Workflow, items: [
      { label: "Rutinas activas", value: 12 },
      { label: "Flujos de trabajo", value: 7 },
      { label: "Desencadenadores", value: 4 },
    ], cta: "Gestionar" },
    { slug: "comunicacion", title: "RED INTERNA", icon: Phone, items: [
      { label: "Canales activos", value: 6 }, { label: "Equipos" }, { label: "Nodos" }, { label: "Cifrado E2E" },
    ], cta: "Abrir red" },
  ];

  const rightPanels = [
    { slug: "analisis", title: "ANÁLISIS IA", icon: Brain, items: [
      { label: "Insights" }, { label: "Predicciones" }, { label: "Reportes" }, { label: "Patrones" },
    ], cta: "Ver análisis" },
    { slug: "datos", title: "DATOS & REPORTES", icon: Database, items: [
      { label: "Dashboard" }, { label: "Estadísticas" }, { label: "Métricas" }, { label: "Exportar" },
    ], cta: "Ver panel" },
    { slug: "memoria", title: "MEMORIA CONTEXTUAL", icon: BookOpen, items: [
      { label: "Recuerdos" }, { label: "Contexto actual" }, { label: "Línea de tiempo" }, { label: "Conexiones" },
    ], cta: "Explorar" },
    { slug: "seguridad", title: "SEGURIDAD", icon: Shield, items: [
      { label: "Protección activa" }, { label: "Monitoreo" }, { label: "Amenazas bloqueadas" }, { label: "Respaldos" },
    ], cta: "Ver seguridad" },
  ];

  const showSection = module !== "panel";
  const { prefs } = useTheme();
  const themeClass = `${neviraThemeClass(prefs.nevira)} ${fontClass(prefs.font)}`;

  return (
    <div className={`${themeClass} nevira-bg theme-transition flex h-[100dvh] w-screen overflow-hidden`}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <ModuleSidebar
          assistant="nevira"
          active={module}
          onSelect={handleSelect}
          footer={<PerfGauge />}
        />
      </div>

      {/* Mobile sidebar */}
      {isMobile && (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="p-0 w-[86vw] max-w-sm border-r border-border/40 bg-transparent">
            <ModuleSidebar
              assistant="nevira"
              active={module}
              onSelect={handleSelect}
              footer={<PerfGauge />}
            />
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
                onClick={() => setModule("panel")}
                className="grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition shrink-0"
                title="Volver al panel"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-xl md:text-2xl tracking-[0.25em] glow-text truncate">NEVIRA</h1>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground truncate">
                {showSection ? getModule("nevira", module).label : "Sistema Operativo Inteligente"}
              </p>
            </div>
          </div>
          <ClockBadge />
        </header>

        <div className="relative flex-1 overflow-hidden">
          {/* Panel home: always rendered, hidden when section active */}
          <div
            className="absolute inset-0 overflow-y-auto transition-opacity duration-500"
            style={{
              opacity: showSection ? 0 : 1,
              pointerEvents: showSection ? "none" : "auto",
            }}
          >
            <HudCorners />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 p-4 md:p-5 min-h-full">
              {/* Cube first on mobile, center on desktop */}
              <div className="order-1 lg:order-2 lg:col-span-6 relative min-h-[320px] sm:min-h-[400px] lg:min-h-0">
                <NeviraCube onSelect={handleSelect} active={module} />
              </div>

              <div className="order-2 lg:order-1 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {leftPanels.map((p) => (
                  <ModulePanel key={p.slug} title={p.title} icon={p.icon} items={p.items} cta={p.cta} onClick={() => setModule(p.slug)} />
                ))}
              </div>

              <div className="order-3 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {rightPanels.map((p) => (
                  <ModulePanel key={p.slug} title={p.title} icon={p.icon} items={p.items} cta={p.cta} onClick={() => setModule(p.slug)} align="right" />
                ))}
              </div>
            </div>
          </div>

          {showSection && (
            <div key={module} className="absolute inset-0 overflow-y-auto p-4 md:p-6 animate-fade-in">
              <HudCorners />
              <NeviraSection slug={module} onChat={() => startChat(module)} />
            </div>
          )}
          {inlineThread && (
            <InlineChatPanel
              assistant="nevira"
              threadId={inlineThread}
              module={module}
              onClose={() => setInlineThread(null)}
            />
          )}
        </div>

        <LiquidChatBar assistant="nevira" onSubmit={(t) => startChat(module, t)} />
      </main>
    </div>
  );
}
