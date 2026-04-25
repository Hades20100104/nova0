import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SoundWavesProps {
  /** Si la música está sonando, las barras se mueven más rápido y más alto. */
  active: boolean;
  /** Cantidad de barras (default 28). */
  bars?: number;
  /** Alto máximo en px. */
  height?: number;
  className?: string;
  variant?: "nevira" | "nova";
}

/**
 * Ondas de sonido siempre visibles. Cuando `active=false` mantienen una
 * animación ambient muy suave; cuando `active=true` simulan reactividad
 * con la música (no podemos leer el audio real de Spotify SDK, así que
 * generamos una forma orgánica con offsets pseudo-aleatorios estables).
 */
export function SoundWaves({ active, bars = 28, height = 48, className, variant = "nevira" }: SoundWavesProps) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const t = (now - startRef.current) / 1000;
      const speed = active ? 4.5 : 1.6;
      const baseAmp = active ? 0.85 : 0.35;
      const minScale = active ? 0.18 : 0.22;

      for (let i = 0; i < bars; i++) {
        const el = refs.current[i];
        if (!el) continue;
        // Mezcla de varias sinusoides + fase única por barra → forma orgánica.
        const phase = i * 0.45;
        const wave =
          Math.sin(t * speed + phase) * 0.5 +
          Math.sin(t * speed * 1.7 + phase * 1.3) * 0.3 +
          Math.sin(t * speed * 0.6 + phase * 0.7) * 0.2;
        // Centro más alto que extremos (forma de onda)
        const center = 1 - Math.abs((i / (bars - 1)) - 0.5) * 1.2;
        const amp = baseAmp * Math.max(0.25, center);
        const value = Math.max(minScale, Math.min(1, 0.5 + wave * amp));
        el.style.transform = `scaleY(${value.toFixed(3)})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, bars]);

  return (
    <div
      className={cn("flex items-center justify-center gap-[3px] select-none", className)}
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={cn(
            "w-[3px] rounded-full origin-center will-change-transform",
            variant === "nova"
              ? "bg-gradient-to-t from-primary/60 via-primary to-accent"
              : "bg-gradient-to-t from-primary/50 via-primary to-primary-glow"
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
