import { useState, useEffect, useRef } from "react";
import { Mic, Send, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/use-voice";

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const voice = useVoice((finalText) => {
    setText(finalText);
    // Auto-enviar tras voz
    setTimeout(() => {
      onSend(finalText);
      setText("");
    }, 200);
  });

  // Mostrar transcript en tiempo real
  useEffect(() => {
    if (voice.listening && voice.transcript) {
      setText(voice.transcript);
    }
  }, [voice.transcript, voice.listening]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="w-full">
      <div className="glass flex items-center gap-2 rounded-full p-2 shadow-card">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/30 hover:text-foreground transition"
          aria-label="Adjuntar"
        >
          <Plus className="h-5 w-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          aria-label="Mensaje para el asistente"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={voice.listening ? "Escuchando…" : "Pregúntame o indícame qué deseas lograr…"}
          disabled={disabled}
          className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />

        {/* Botón micrófono */}
        <button
          type="button"
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
          disabled={!voice.supported || disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
            voice.listening
              ? "bg-destructive text-destructive-foreground animate-pulse shadow-glow"
              : "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          aria-label={voice.listening ? "Detener" : "Hablar"}
          title={voice.supported ? "Habla por voz" : "Tu navegador no soporta voz"}
        >
          {voice.listening ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>

        {/* Botón enviar (solo si hay texto) */}
        {text.trim() && (
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow hover:scale-105 transition animate-float-up"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      {!voice.supported && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          La voz no está disponible en este navegador (usa Chrome/Edge para esa función).
        </p>
      )}
    </div>
  );
}
