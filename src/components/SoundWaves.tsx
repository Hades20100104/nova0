import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SoundWavesProps {
  /** Si la música está sonando (no en pausa). */
  active: boolean;
  /** BPM real del track (de Spotify audio-features). Si null, usa default. */
  bpm?: number | null;
  /** Energía 0-1 del track. Modula amplitud. */
  energy?: number | null;
  /** Cantidad de barras (default 28). */
  bars?: number;
  /** Alto máximo en px. */
  height?: number;
  className?: string;
  variant?: "nevira" | "nova";
}

/**
 * Ondas de sonido siempre visibles. Cuando hay música sonando se sincronizan
 * con el tempo real (BPM) y la energía del track de Spotify. Cuando no hay
 * audio reproduciéndose se mantiene una animación ambient suave.
 */
export function SoundWaves({
  active,
  bpm,
  energy,
  bars = 28,
  height = 48,
  className,
  variant = "nevira",
}: SoundWavesProps) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const t = (now - startRef.current) / 1000;
      // Velocidad: si hay BPM, lo usamos (beats por segundo = bpm/60).
      // Multiplicamos por 2π para que un ciclo de seno = 1 beat.
      const beatsPerSec = active && bpm ? bpm / 60 : 0;
      const speed = active ? (beatsPerSec > 0 ? beatsPerSec * 2 * Math.PI : 4.5) : 1.6;
      // Amplitud: energía del track 0-1, fallback 0.7 si no hay info.
      const e = active ? Math.max(0.4, energy ?? 0.7) : 0.35;
      const baseAmp = e;
      const minScale = active ? 0.18 : 0.22;
      // Pulso al ritmo del beat (solo cuando hay BPM real)
      const beatPulse =
        active && beatsPerSec > 0 ? 0.15 * Math.max(0, Math.sin(t * beatsPerSec * 2 * Math.PI)) : 0;

      for (let i = 0; i < bars; i++) {
        const el = refs.current[i];
        if (!el) continue;
        const phase = i * 0.45;
        const wave =
          Math.sin(t * speed + phase) * 0.5 +
          Math.sin(t * speed * 1.7 + phase * 1.3) * 0.3 +
          Math.sin(t * speed * 0.6 + phase * 0.7) * 0.2;
        const center = 1 - Math.abs(i / (bars - 1) - 0.5) * 1.2;
        const amp = baseAmp * Math.max(0.25, center);
        const value = Math.max(minScale, Math.min(1, 0.5 + wave * amp + beatPulse));
        el.style.transform = `scaleY(${value.toFixed(3)})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, bars, bpm, energy]);

  return (
    <div
      className={cn("flex items-center justify-center gap-[3px] select-none", className)}
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={cn(
            "w-[3px] rounded-full origin-center will-change-transform",
            variant === "nova"
              ? "bg-gradient-to-t from-primary/60 via-primary to-accent"
              : "bg-gradient-to-t from-primary/50 via-primary to-primary-glow",
          )}
          style={{
            height: "100%",
            transform: "scaleY(0.3)",
            boxShadow: "0 0 6px var(--primary)",
          }}
        />
      ))}
    </div>
  );
}
