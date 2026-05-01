import { useState } from "react";
import { Send, Mic } from "lucide-react";
import { Orb } from "@/components/Orb";
import { SoundWaves } from "@/components/SoundWaves";
import { useVoice } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

interface HomeHeroProps {
  themeName: "NEVIRA" | "NOVA";
  theme: "nevira" | "nova";
  musicActive: boolean;
  onSearch: (q: string) => void;
}

/**
 * Hero del dashboard: orbe grande + ondas siempre vivas + barra de búsqueda
 * que envía el texto al chat.
 */
export function HomeHero({ themeName, theme, musicActive, onSearch }: HomeHeroProps) {
  const [text, setText] = useState("");
  const voice = useVoice((finalText) => {
    setText(finalText);
    setTimeout(() => onSearch(finalText), 150);
  });

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSearch(t);
    setText("");
  };

  return (
    <section className="relative flex flex-col items-center text-center">
      {/* Etiqueta de modo */}
      <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {themeName === "NOVA" ? "NOVA · Creatividad" : "NEVIRA · Ejecución"}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        Modo <span className="text-gradient">{themeName}</span>
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground sm:text-base">
        {themeName === "NOVA"
          ? "Creativa. Inspiradora. Sin límites."
          : "Precisa. Eficiente. Siempre enfocada."}
      </p>

      {/* Orbe + ondas */}
      <div className="relative mt-4 flex flex-col items-center sm:mt-6">
        <Orb size={220} active variant={theme} className="sm:[transform:scale(1.1)]" />
        <SoundWaves
          active={musicActive}
          variant={theme}
          bars={36}
          height={48}
          className="mt-2 w-full max-w-md sm:max-w-lg"
        />
      </div>

      {/* Buscador grande */}
      <div className="mt-6 w-full max-w-2xl">
        <div className="glass flex items-center gap-2 rounded-full p-2 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <span className="text-base">✦</span>
          </span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            placeholder={voice.listening ? "Escuchando…" : `¿Qué deseas que haga ${themeName}?`}
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
          />
          <button
            type="button"
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            disabled={!voice.supported}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
              voice.listening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow hover:scale-105 disabled:opacity-40",
            )}
            aria-label={voice.listening ? "Detener" : "Hablar"}
          >
            <Mic className="h-4 w-4" />
          </button>
          {text.trim() && (
            <button
              type="button"
              onClick={submit}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow transition hover:scale-105 animate-float-up"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        {!voice.supported && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            La voz no está disponible en este navegador (usa Chrome/Edge).
          </p>
        )}
      </div>
    </section>
  );
}
