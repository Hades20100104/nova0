import { createFileRoute, Link } from "@tanstack/react-router";
import novaLogo from "@/assets/nova-logo.png";
import neviraLogo from "@/assets/nevira-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOVA & NEVIRA — Asistentes Inteligentes" },
      { name: "description", content: "Elige tu asistente: NOVA, IA creativa cósmica 3D, o NEVIRA, Sistema Operativo Inteligente con dashboard, automatización y voz." },
      { property: "og:title", content: "Escoge tu Asistente de IA: NOVA o NEVIRA" },
      { property: "og:description", content: "Dos asistentes con voz tipo JARVIS: NOVA para crear e imaginar, NEVIRA para productividad y datos." },
      { property: "og:url", content: "https://nova0.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://nova0.lovable.app/" }],
  }),
  component: SelectorPage,
});

function SelectorPage() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
      <h1 className="sr-only">Escoge tu Asistente de IA: NOVA o NEVIRA</h1>
      <Link to="/nova" className="nova-bg group relative flex items-center justify-center overflow-hidden p-12 cursor-pointer">
        <div className="relative z-10 text-center fade-up">
          <img src={novaLogo} alt="NOVA" width={160} height={160} className="mx-auto drop-shadow-[0_0_60px_var(--glow)] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12" />
          <h2 className="mt-6 font-display text-6xl tracking-[0.2em] glow-text">NOVA</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.4em] text-muted-foreground">IA creativa · consciente · inspiradora</p>
          <p className="mt-6 max-w-sm mx-auto text-foreground/70">Esfera de energía 3D rotable 360°. Crea, imagina y siente.</p>
        </div>
      </Link>

      <Link to="/nevira" className="nevira-bg theme-nevira group relative flex items-center justify-center overflow-hidden p-12 cursor-pointer">
        <div className="relative z-10 text-center fade-up">
          <img src={neviraLogo} alt="NEVIRA" width={140} height={140} className="mx-auto drop-shadow-[0_0_50px_var(--glow)] transition-transform duration-700 group-hover:scale-110" />
          <h2 className="mt-6 font-display text-6xl tracking-[0.2em] glow-text">NEVIRA</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.4em] text-muted-foreground font-mono">Sistema Operativo Inteligente</p>
          <p className="mt-6 max-w-sm mx-auto text-foreground/70">Dashboard analítico. Productividad, datos y automatización.</p>
        </div>
      </Link>
    </div>
  );
}
