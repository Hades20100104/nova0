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
 * - NOVA: estrella brillante 3D con anillos orbitales en perspectiva y planetas.
 */
export function Orb({ size = 280, active = false, variant, className }: OrbProps) {
  if (variant === "nova") return <NovaStar3D size={size} active={active} className={className} />;
  return <NeviraOrb size={size} active={active} className={className} />;
}

/* ============== NEVIRA — Esfera limpia (sin estrella) ============== */
function NeviraOrb({
  size,
  active,
  className,
}: {
  size: number;
  active: boolean;
  className?: string;
}) {
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
          active && "animate-orb-pulse",
        )}
        style={{ background: "var(--gradient-orb)" }}
      />

      {/* Esfera central limpia, sin estrella */}
      <div
        className={cn(
          "relative rounded-full shadow-glow animate-orb-pulse",
          "flex items-center justify-center overflow-hidden",
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

/* ============== NOVA — Estrella 3D con anillos en perspectiva ============== */

interface NovaRing {
  scale: number;
  rotateX: number;
  rotateZ: number;
  duration: number;
  reverse?: boolean;
  color: string;
  dashed?: boolean;
  dots?: { count: number; color: string; size: number }[];
}

const NOVA_RINGS: NovaRing[] = [
  {
    scale: 1.0,
    rotateX: 75,
    rotateZ: 0,
    duration: 30,
    color: "oklch(0.7 0.15 280 / 0.5)",
    dashed: true,
    dots: [{ count: 2, color: "oklch(0.78 0.18 70)", size: 6 }],
  },
  {
    scale: 0.92,
    rotateX: 75,
    rotateZ: 90,
    duration: 22,
    reverse: true,
    color: "oklch(0.7 0.15 280 / 0.45)",
    dashed: true,
    dots: [{ count: 2, color: "oklch(0.75 0.16 290)", size: 5 }],
  },
  {
    scale: 0.95,
    rotateX: 70,
    rotateZ: 35,
    duration: 26,
    color: "oklch(0.72 0.14 270 / 0.4)",
    dots: [{ count: 1, color: "oklch(0.78 0.18 70)", size: 5 }],
  },
  {
    scale: 0.88,
    rotateX: 72,
    rotateZ: -40,
    duration: 34,
    reverse: true,
    color: "oklch(0.72 0.14 290 / 0.4)",
    dashed: true,
    dots: [{ count: 1, color: "oklch(0.8 0.16 60)", size: 5 }],
  },
  {
    scale: 0.7,
    rotateX: 70,
    rotateZ: 60,
    duration: 18,
    color: "oklch(0.75 0.16 280 / 0.55)",
    dashed: true,
    dots: [{ count: 1, color: "oklch(0.85 0.18 80)", size: 4 }],
  },
];

function NovaStar3D({
  size,
  active,
  className,
}: {
  size: number;
  active: boolean;
  className?: string;
}) {
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
      {NOVA_RINGS.map((ring, i) => (
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
function Ring3D({ ring, containerSize }: { ring: NovaRing; containerSize: number }) {
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
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1.5px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`,
            boxShadow: `0 0 12px ${ring.color}`,
          }}
        />
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
          }),
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

      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background:
            "radial-gradient(circle, oklch(0.8 0.2 290 / 0.7), oklch(0.6 0.2 280 / 0.3) 50%, transparent 80%)",
        }}
      />

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
