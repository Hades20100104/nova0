import { cn } from "@/lib/utils";

interface OrbProps {
  size?: number;
  active?: boolean;
  variant: "nevira" | "nova";
  className?: string;
}

/**
 * Orbe central animado.
 * - NEVIRA: esfera 3D con estrella brillante central, anillos orbitales en perspectiva y planetas.
 * - NOVA: sistema solar con NOVA como sol y planetas orbitando.
 */
export function Orb({ size = 280, active = false, variant, className }: OrbProps) {
  if (variant === "nova") return <NovaSolarSystem size={size} active={active} className={className} />;
  return <NeviraOrb3D size={size} active={active} className={className} />;
}

/* ============== NEVIRA — Esfera 3D con estrella y anillos en perspectiva ============== */

interface NeviraRing {
  /** Tamaño relativo del anillo (1 = igual al contenedor). */
  scale: number;
  /** Rotación X (perspectiva vertical) en grados. */
  rotateX: number;
  /** Rotación Y inicial. */
  rotateY: number;
  /** Rotación Z (inclinación) en grados. */
  rotateZ: number;
  /** Duración de la rotación en segundos. */
  duration: number;
  /** Dirección. */
  reverse?: boolean;
  /** Color del anillo. */
  color: string;
  /** Si es punteado. */
  dashed?: boolean;
  /** Planetas/puntos en este anillo (cantidad). */
  dots?: { count: number; color: string; size: number }[];
}

const NEVIRA_RINGS: NeviraRing[] = [
  // Anillo principal grande horizontal (tipo ecuador)
  {
    scale: 1.0,
    rotateX: 75,
    rotateY: 0,
    rotateZ: 0,
    duration: 30,
    color: "oklch(0.7 0.15 280 / 0.5)",
    dashed: true,
    dots: [{ count: 2, color: "oklch(0.78 0.18 70)", size: 6 }],
  },
  // Anillo vertical
  {
    scale: 0.92,
    rotateX: 75,
    rotateY: 0,
    rotateZ: 90,
    duration: 22,
    reverse: true,
    color: "oklch(0.7 0.15 280 / 0.45)",
    dashed: true,
    dots: [{ count: 2, color: "oklch(0.75 0.16 290)", size: 5 }],
  },
  // Anillo diagonal 1
  {
    scale: 0.95,
    rotateX: 70,
    rotateY: 0,
    rotateZ: 35,
    duration: 26,
    color: "oklch(0.72 0.14 270 / 0.4)",
    dots: [{ count: 1, color: "oklch(0.78 0.18 70)", size: 5 }],
  },
  // Anillo diagonal 2
  {
    scale: 0.88,
    rotateX: 72,
    rotateY: 0,
    rotateZ: -40,
    duration: 34,
    reverse: true,
    color: "oklch(0.72 0.14 290 / 0.4)",
    dashed: true,
    dots: [{ count: 1, color: "oklch(0.8 0.16 60)", size: 5 }],
  },
  // Anillo interno pequeño
  {
    scale: 0.7,
    rotateX: 70,
    rotateY: 0,
    rotateZ: 60,
    duration: 18,
    color: "oklch(0.75 0.16 280 / 0.55)",
    dashed: true,
    dots: [{ count: 1, color: "oklch(0.85 0.18 80)", size: 4 }],
  },
];

function NeviraOrb3D({ size, active, className }: { size: number; active: boolean; className?: string }) {
  const total = size * 1.1;
  const starSize = size * 0.35;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{
        width: total,
        height: total,
        perspective: `${total * 2}px`,
        perspectiveOrigin: "50% 50%",
      }}
    >
      {/* Esfera de fondo (vidrio sutil) */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          background:
            "radial-gradient(circle at 35% 30%, oklch(0.55 0.12 280 / 0.25), oklch(0.3 0.1 290 / 0.15) 50%, transparent 75%)",
          boxShadow:
            "inset 0 0 80px oklch(0.5 0.15 280 / 0.3), inset -20px -20px 60px oklch(0.2 0.1 290 / 0.4)",
        }}
      />

      {/* Halo externo */}
      <div
        className={cn("absolute rounded-full blur-3xl opacity-60", active && "animate-orb-pulse")}
        style={{
          width: size * 1.05,
          height: size * 1.05,
          background:
            "radial-gradient(circle, oklch(0.65 0.2 290 / 0.5), oklch(0.55 0.18 270 / 0.25) 50%, transparent 75%)",
        }}
      />

      {/* Anillos 3D con planetas */}
      {NEVIRA_RINGS.map((ring, i) => (
        <Ring3D key={`ring-${i}`} ring={ring} containerSize={total} />
      ))}

      {/* Estrella central brillante con destellos cruzados */}
      <Starburst size={starSize} active={active} />

      {/* Pequeñas estrellas/destellos de fondo */}
      <Sparkles count={20} radius={total / 2} />
    </div>
  );
}

/* ---- Anillo 3D ---- */
function Ring3D({ ring, containerSize }: { ring: NeviraRing; containerSize: number }) {
  const ringSize = containerSize * ring.scale;
  const animName = ring.reverse ? "ring-spin-reverse" : "ring-spin";

  return (
    <div
      className="absolute"
      style={{
        width: ringSize,
        height: ringSize,
        transformStyle: "preserve-3d",
        transform: `rotateX(${ring.rotateX}deg) rotateZ(${ring.rotateZ}deg)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          animation: `${animName} ${ring.duration}s linear infinite`,
        }}
      >
        {/* Anillo (borde) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1.5px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`,
            boxShadow: `0 0 12px ${ring.color}`,
          }}
        />
        {/* Planetas/puntos sobre el anillo */}
        {ring.dots?.map((group, gi) =>
          Array.from({ length: group.count }).map((_, di) => {
            const angle = (360 / group.count) * di + gi * 45;
            return (
              <div
                key={`dot-${gi}-${di}`}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: group.size,
                  height: group.size,
                  marginLeft: -group.size / 2,
                  marginTop: -group.size / 2,
                  transform: `rotate(${angle}deg) translateX(${ringSize / 2}px)`,
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: group.size,
                    height: group.size,
                    background: `radial-gradient(circle at 30% 30%, oklch(0.95 0.1 80), ${group.color})`,
                    boxShadow: `0 0 ${group.size * 2}px ${group.color}, 0 0 ${group.size * 4}px ${group.color}`,
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---- Estrella central con destellos cruzados ---- */
function Starburst({ size, active }: { size: number; active: boolean }) {
  return (
    <div
      className={cn("absolute flex items-center justify-center", active && "animate-orb-pulse")}
      style={{ width: size, height: size }}
    >
      {/* Núcleo brillante */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.35,
          height: size * 0.35,
          background:
            "radial-gradient(circle, oklch(1 0 0) 0%, oklch(0.95 0.08 80) 25%, oklch(0.75 0.2 290) 60%, transparent 90%)",
          boxShadow:
            "0 0 40px oklch(0.85 0.18 290), 0 0 80px oklch(0.7 0.22 290 / 0.7), 0 0 120px oklch(0.6 0.2 280 / 0.5)",
          filter: "blur(0.5px)",
        }}
      />

      {/* Halo de la estrella */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background:
            "radial-gradient(circle, oklch(0.8 0.2 290 / 0.7), oklch(0.6 0.2 280 / 0.3) 50%, transparent 80%)",
        }}
      />

      {/* Destello vertical */}
      <div
        className="absolute"
        style={{
          width: size * 0.04,
          height: size * 1.4,
          background:
            "linear-gradient(to bottom, transparent 0%, oklch(0.85 0.15 290 / 0.6) 30%, oklch(1 0 0) 50%, oklch(0.85 0.15 290 / 0.6) 70%, transparent 100%)",
          filter: "blur(1px)",
          boxShadow: "0 0 20px oklch(0.85 0.2 290)",
        }}
      />

      {/* Destello horizontal */}
      <div
        className="absolute"
        style={{
          width: size * 1.4,
          height: size * 0.04,
          background:
            "linear-gradient(to right, transparent 0%, oklch(0.85 0.15 290 / 0.6) 30%, oklch(1 0 0) 50%, oklch(0.85 0.15 290 / 0.6) 70%, transparent 100%)",
          filter: "blur(1px)",
          boxShadow: "0 0 20px oklch(0.85 0.2 290)",
        }}
      />

      {/* Destellos diagonales más sutiles */}
      <div
        className="absolute"
        style={{
          width: size * 0.025,
          height: size * 1.1,
          background:
            "linear-gradient(to bottom, transparent, oklch(0.9 0.12 290 / 0.5) 50%, transparent)",
          transform: "rotate(45deg)",
          filter: "blur(1px)",
        }}
      />
      <div
        className="absolute"
        style={{
          width: size * 0.025,
          height: size * 1.1,
          background:
            "linear-gradient(to bottom, transparent, oklch(0.9 0.12 290 / 0.5) 50%, transparent)",
          transform: "rotate(-45deg)",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}

/* ---- Pequeños destellos / estrellas de fondo ---- */
function Sparkles({ count, radius }: { count: number; radius: number }) {
  const stars = Array.from({ length: count }, (_, i) => {
    const seed = i * 9301 + 49297;
    const a = ((seed % 233280) / 233280) * Math.PI * 2;
    const r = (((seed * 7) % 233280) / 233280) * radius * 0.95 + radius * 0.4;
    const s = (((seed * 13) % 233280) / 233280) * 1.8 + 0.6;
    const o = (((seed * 17) % 233280) / 233280) * 0.5 + 0.3;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, s, o, d: i % 5 };
  });
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={`spk-${i}`}
          className="absolute rounded-full bg-foreground"
          style={{
            width: s.s,
            height: s.s,
            left: `calc(50% + ${s.x}px)`,
            top: `calc(50% + ${s.y}px)`,
            opacity: s.o,
            boxShadow: "0 0 4px currentColor",
            animation: `orb-pulse ${3 + s.d}s ease-in-out infinite`,
            animationDelay: `${s.d * 0.4}s`,
          }}
        />
      ))}
    </>
  );
}

/* ============== NOVA — Sistema solar ============== */
interface Planet {
  distance: number;
  size: number;
  color: string;
  duration: number;
  tilt: number;
  phase: number;
}

const PLANETS: Planet[] = [
  { distance: 0.22, size: 0.025, color: "oklch(0.75 0.12 60)", duration: 6, tilt: 0, phase: 0.1 },
  { distance: 0.31, size: 0.04, color: "oklch(0.78 0.16 80)", duration: 10, tilt: -8, phase: 0.3 },
  { distance: 0.42, size: 0.045, color: "oklch(0.65 0.18 240)", duration: 14, tilt: 5, phase: 0.6 },
  { distance: 0.54, size: 0.035, color: "oklch(0.6 0.2 30)", duration: 18, tilt: -3, phase: 0.85 },
  { distance: 0.7, size: 0.07, color: "oklch(0.7 0.13 70)", duration: 26, tilt: 6, phase: 0.2 },
  { distance: 0.86, size: 0.055, color: "oklch(0.78 0.1 95)", duration: 34, tilt: -10, phase: 0.55 },
];

function NovaSolarSystem({ size, active, className }: { size: number; active: boolean; className?: string }) {
  const total = size * 1.05;
  const sunSize = size * 0.28;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: total, height: total }}
    >
      <Stars count={40} radius={total / 2} />

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

      <div
        className="absolute rounded-full shadow-glow animate-orb-pulse"
        style={{
          width: sunSize,
          height: sunSize,
          background:
            "radial-gradient(circle at 35% 35%, oklch(0.92 0.15 75), oklch(0.7 0.22 35) 45%, oklch(0.45 0.22 295) 90%)",
          boxShadow:
            "0 0 60px oklch(0.82 0.15 80 / 0.7), 0 0 120px oklch(0.65 0.22 295 / 0.5), inset -10px -10px 30px oklch(0.3 0.15 295 / 0.5)",
        }}
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-80 animate-orb-pulse"
          style={{
            background: "radial-gradient(circle, oklch(0.82 0.15 80 / 0.6), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tracking-[0.25em] text-primary-foreground drop-shadow-[0_0_8px_oklch(0.82_0.15_80)]"
            style={{ fontSize: sunSize * 0.18 }}
          >
            NOVA
          </span>
        </div>
      </div>

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

function Stars({ count, radius }: { count: number; radius: number }) {
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
