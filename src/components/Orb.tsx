import { cn } from "@/lib/utils";

interface OrbProps {
  size?: number;
  active?: boolean;
  className?: string;
}

/**
 * Orbe central animado, igual a las referencias visuales de NEVIRA/NOVA.
 * Usa los gradientes del tema actual (cambia automáticamente entre día/noche).
 */
export function Orb({ size = 280, active = false, className }: OrbProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Anillos orbitales */}
      <div className="absolute inset-0 animate-orb-rotate">
        <div className="absolute inset-0 rounded-full border border-primary/20" />
        <div className="absolute inset-4 rounded-full border border-primary/15 rotate-45" />
        <div className="absolute inset-10 rounded-full border border-accent/20 -rotate-12" />
      </div>

      {/* Halo externo */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-3xl opacity-70",
          active && "animate-orb-pulse"
        )}
        style={{ background: "var(--gradient-orb)" }}
      />

      {/* Esfera central */}
      <div
        className={cn(
          "relative rounded-full shadow-glow animate-orb-pulse",
          "flex items-center justify-center"
        )}
        style={{
          width: size * 0.45,
          height: size * 0.45,
          background: "var(--gradient-orb)",
        }}
      >
        <div className="h-1/2 w-1/2 rounded-full bg-foreground/90 blur-sm opacity-60" />
        {/* Estrella central */}
        <svg
          viewBox="0 0 24 24"
          className="absolute h-1/2 w-1/2 text-primary-foreground drop-shadow-[0_0_10px_var(--primary-glow)]"
          fill="currentColor"
        >
          <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 22 L10.5 12.5 L3 11 L10.5 9.5 Z" />
        </svg>
      </div>

      {/* Partículas */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <div
          key={deg}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_currentColor]"
          style={{
            transform: `rotate(${deg}deg) translateX(${size / 2 - 10}px)`,
            animation: `orb-rotate ${20 + i * 3}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
