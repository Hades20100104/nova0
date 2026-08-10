import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MERLIN_MODULES, MERLIN_GROUPS } from "@/lib/merlin";
import { MerlinSection } from "@/components/merlin/MerlinSections";
import { MerlinChatDock } from "@/components/merlin/MerlinChatDock";
import { MerlinUnlock } from "@/components/merlin/MerlinUnlock";
import { useMerlinAccess } from "@/lib/merlin-data";
import { ClockBadge } from "@/components/dashboard/ClockBadge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Sparkles, Cpu, Wand2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/merlin")({
  head: () => ({
    meta: [
      { title: "MERLIN — Cerebro Educativo Adaptativo" },
      { name: "description", content: "MERLIN aprende cómo aprendes: mapa del conocimiento, diagnóstico adaptativo, práctica con propósito y rutas que se reconstruyen con evidencia." },
      { property: "og:title", content: "MERLIN — Cerebro Educativo Adaptativo" },
      { property: "og:description", content: "Profesor personal con mapa de conceptos, evidencia y confianza explícita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://nova0.lovable.app/merlin" },
    ],
    links: [{ rel: "canonical", href: "https://nova0.lovable.app/merlin" }],
  }),
  component: MerlinHome,
});

function Sidebar({ active, onSelect }: { active: string; onSelect: (s: string) => void }) {
  const navigate = useNavigate();
  return (
    <aside className="liquid-glass sidebar-edge flex h-full w-72 shrink-0 flex-col border-r border-border/40 rounded-none">
      <div className="flex items-center gap-3 border-b border-border/30 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/40 bg-primary/15 drop-shadow-[0_0_18px_var(--glow)]">
          <Wand2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-sm tracking-[0.25em] glow-text">MERLIN</div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Cerebro educativo</div>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/40 p-1 text-[11px]">
          <button onClick={() => navigate({ to: "/nova" })} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-foreground/10"><Sparkles className="h-3 w-3" /> Nova</button>
          <button onClick={() => navigate({ to: "/nevira" })} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-foreground/10"><Cpu className="h-3 w-3" /> Nevira</button>
          <button className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary/20 py-1.5 border border-primary/50"><Wand2 className="h-3 w-3" /> Merlin</button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {MERLIN_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="sidebar-section-label">{g.title}</div>
            {g.slugs.map((slug) => {
              const m = MERLIN_MODULES.find((x) => x.slug === slug);
              if (!m) return null;
              const Icon = m.icon;
              const isActive = slug === active;
              return (
                <button key={slug} onClick={() => onSelect(slug)} className={`module-item w-full ${isActive ? "is-active" : ""}`}>
                  <span className="module-bar" />
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10"><Icon className="h-4 w-4" /></span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="module-label block truncate">{m.label}</span>
                    <span className="module-desc block truncate">{m.description}</span>
                  </span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function MerlinHome() {
  const { data, isLoading } = useMerlinAccess();
  const [section, setSection] = useState("inicio");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isLoading) {
    return <div className="merlin-bg theme-merlin grid h-[100dvh] place-items-center text-sm text-muted-foreground">Invocando a Merlin…</div>;
  }

  if (!data?.unlocked) {
    return (
      <div className="merlin-bg theme-merlin grid h-[100dvh] place-items-center p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="font-display text-4xl tracking-[0.3em] glow-text">MERLIN</h1>
          <p className="text-sm text-muted-foreground">Este integrante está sellado. Necesitas la contraseña para despertarlo.</p>
          <MerlinUnlock />
        </div>
      </div>
    );
  }

  const label = MERLIN_MODULES.find((m) => m.slug === section)?.label ?? "Inicio";

  return (
    <div className="merlin-bg theme-merlin theme-transition flex h-[100dvh] w-screen overflow-hidden">
      <div className="hidden lg:flex"><Sidebar active={section} onSelect={setSection} /></div>
      {isMobile && (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-[86vw] max-w-sm border-r border-border/40 bg-transparent p-0">
            <Sidebar active={section} onSelect={(s) => { setSection(s); setNavOpen(false); }} />
          </SheetContent>
        </Sheet>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setNavOpen(true)} aria-label="Abrir menú" className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl tracking-[0.3em] glow-text md:text-2xl">MERLIN</h1>
              <p className="truncate text-[9px] uppercase tracking-[0.3em] text-muted-foreground md:text-[10px]">{label}</p>
            </div>
          </div>
          <ClockBadge />
        </header>

        <div key={section} className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          <MerlinSection slug={section} subjectId={subjectId} setSubjectId={setSubjectId} onOpen={setSection} />
        </div>

        <MerlinChatDock section={section} />
      </main>
    </div>
  );
}
