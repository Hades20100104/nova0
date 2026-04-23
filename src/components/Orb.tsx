import { cn } from "@/lib/utils";

interface OrbProps {
  size?: number;
  active?: boolean;
  variant: "nevira" | "nova";
  className?: string;
}

/**
 * Orbe central animado.
 * - NEVIRA: esfera limpia con anillos sutiles, SIN estrella en el centro.
 * - NOVA: sistema solar con NOVA como sol y planetas orbitando.
 */
export function Orb({ size = 280, active = false, variant, className }: OrbProps) {
  if (variant === "nova") return <NovaSolarSystem size={size} active={active} className={className} />;
  return <NeviraOrb size={size} active={active} className={className} />;
}

/* ============== NEVIRA — Esfera limpia (sin estrella) ============== */
function NeviraOrb({ size, active, className }: { size: number; active: boolean; className?: string }) {
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

      {/* Esfera central limpia, sin estrella */}
      <div
        className={cn(
          "relative rounded-full shadow-glow animate-orb-pulse",
          "flex items-center justify-center overflow-hidden"
        )}
        style={{
          width: size * 0.45,
          height: size * 0.45,
          background: "var(--gradient-orb)",
        }}
      >
        {/* Brillo interno (highlight tipo planeta) */}
        <div
          className="absolute rounded-full bg-foreground/40 blur-md"
          style={{
            width: "40%",
            height: "40%",
            top: "15%",
            left: "20%",
          }}
        />
      </div>

      {/* Partículas orbitales */}
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

/* ============== NOVA — Sistema solar ============== */
interface Planet {
  /** Distancia desde el centro como fracción del radio total (0-1). */
  distance: number;
  /** Tamaño relativo (0-1). */
  size: number;
  /** Color base. */
  color: string;
  /** Duración de la órbita en segundos. */
  duration: number;
  /** Inclinación de la órbita en grados. */
  tilt: number;
  /** Fase inicial (0-1). */
  phase: number;
}

const PLANETS: Planet[] = [
  { distance: 0.22, size: 0.025, color: "oklch(0.75 0.12 60)",  duration: 6,  tilt: 0,  phase: 0.1 },  // Mercurio
  { distance: 0.31, size: 0.04,  color: "oklch(0.78 0.16 80)",  duration: 10, tilt: -8, phase: 0.3 },  // Venus
  { distance: 0.42, size: 0.045, color: "oklch(0.65 0.18 240)", duration: 14, tilt: 5,  phase: 0.6 },  // Tierra
  { distance: 0.54, size: 0.035, color: "oklch(0.6 0.2 30)",    duration: 18, tilt: -3, phase: 0.85 }, // Marte
  { distance: 0.7,  size: 0.07,  color: "oklch(0.7 0.13 70)",   duration: 26, tilt: 6,  phase: 0.2 },  // Júpiter
  { distance: 0.86, size: 0.055, color: "oklch(0.78 0.1 95)",   duration: 34, tilt: -10, phase: 0.55 }, // Saturno
];

function NovaSolarSystem({ size, active, className }: { size: number; active: boolean; className?: string }) {
  // Aumentamos el tamaño efectivo para que las órbitas externas no se corten
  const total = size * 1.05;
  const sunSize = size * 0.28;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: total, height: total }}
    >
      {/* Estrellas de fondo */}
      <Stars count={40} radius={total / 2} />

      {/* Órbitas (líneas) */}
      {PLANETS.map((p, i) => {
        const orbitSize = total * p.distance * 2;
        return (
          <div
            key={`orbit-${i}`}
            className="absolute rounded-full border border-primary/15"
            style={{
              width: orbitSize,
              height: orbitSize,
              transform: `rotate(${p.tilt}deg)`,
            }}
          />
        );
      })}

      {/* Sol = NOVA */}
      <div
        className="absolute rounded-full shadow-glow animate-orb-pulse"
        style={{
          width: sunSize,
          height: sunSize,
          background: "radial-gradient(circle at 35% 35%, oklch(0.92 0.15 75), oklch(0.7 0.22 35) 45%, oklch(0.45 0.22 295) 90%)",
          boxShadow:
            "0 0 60px oklch(0.82 0.15 80 / 0.7), 0 0 120px oklch(0.65 0.22 295 / 0.5), inset -10px -10px 30px oklch(0.3 0.15 295 / 0.5)",
        }}
      >
        {/* Corona / llamas */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-80 animate-orb-pulse"
          style={{
            background: "radial-gradient(circle, oklch(0.82 0.15 80 / 0.6), transparent 70%)",
          }}
        />
        {/* Etiqueta NOVA */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tracking-[0.25em] text-primary-foreground drop-shadow-[0_0_8px_oklch(0.82_0.15_80)]"
            style={{ fontSize: sunSize * 0.18 }}
          >
            NOVA
          </span>
        </div>
      </div>

      {/* Planetas */}
      {PLANETS.map((p, i) => {
        const orbitSize = total * p.distance * 2;
        const planetSize = Math.max(6, total * p.size);
        return (
          <div
            key={`planet-${i}`}
            className="absolute"
            style={{
              width: orbitSize,
              height: orbitSize,
              transform: `rotate(${p.tilt}deg)`,
              animation: `orb-rotate ${p.duration}s linear infinite`,
              animationDelay: `${-p.duration * p.phase}s`,
              animationPlayState: active ? "running" : "running",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: planetSize,
                height: planetSize,
                top: `calc(50% - ${planetSize / 2}px)`,
                right: `-${planetSize / 2}px`,
                background: p.color,
                boxShadow: `0 0 ${planetSize}px ${p.color}, inset -2px -2px 4px oklch(0 0 0 / 0.4)`,
              }}
            />
            {/* Anillo de Saturno */}
            {i === 5 && (
              <div
                className="absolute rounded-full border-2"
                style={{
                  width: planetSize * 2.4,
                  height: planetSize * 0.6,
                  top: `calc(50% - ${planetSize * 0.3}px)`,
                  right: `-${planetSize * 1.2 - planetSize / 2}px`,
                  borderColor: "oklch(0.78 0.1 95 / 0.5)",
                  transform: "rotate(-20deg)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============== Estrellas de fondo ============== */
function Stars({ count, radius }: { count: number; radius: number }) {
  // Posiciones determinísticas para que no parpadeen al re-renderizar
  const stars = Array.from({ length: count }, (_, i) => {
    const seed = i * 9301 + 49297;
    const a = ((seed % 233280) / 233280) * Math.PI * 2;
    const r = (((seed * 7) % 233280) / 233280) * radius;
    const s = (((seed * 13) % 233280) / 233280) * 1.5 + 0.5;
    const o = (((seed * 17) % 233280) / 233280) * 0.6 + 0.3;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, s, o, d: i % 5 };
  });
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full bg-foreground"
          style={{
            width: s.s,
            height: s.s,
            left: `calc(50% + ${s.x}px)`,
            top: `calc(50% + ${s.y}px)`,
            opacity: s.o,
            animation: `orb-pulse ${3 + s.d}s ease-in-out infinite`,
            animationDelay: `${s.d * 0.4}s`,
          }}
        />
      ))}
    </>
  );
}
