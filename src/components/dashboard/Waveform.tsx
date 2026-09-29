import { useEffect, useRef, useState } from "react";

interface WaveformProps {
  bars?: number;
  color?: string;
  height?: number;
  speed?: number;
  variant?: "smooth" | "spiky" | "pulse";
}

export function Waveform({
  bars = 60,
  color = "var(--primary)",
  height = 40,
  speed = 80,
  variant = "smooth",
}: WaveformProps) {
  const [vals, setVals] = useState<number[]>(() =>
    Array.from({ length: bars }, () => 0.3 + Math.random() * 0.5),
  );
  const tRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (now - last >= speed) {
        last = now;
        tRef.current += 0.18;
        const t = tRef.current;
        setVals((arr) =>
          arr.map((_, i) => {
            if (variant === "spiky") {
              const n = Math.abs(Math.sin(t * 1.6 + i * 0.9)) * Math.random();
              return 0.15 + n * 0.85;
            }
            if (variant === "pulse") {
              const center = bars / 2;
              const dist = Math.abs(i - center) / center;
              const wave = Math.sin(t * 2 - dist * 6) * 0.5 + 0.5;
              return 0.2 + (1 - dist) * wave * 0.8;
            }
            // smooth: layered sines for organic feel
            const a = Math.sin(t + i * 0.25);
            const b = Math.sin(t * 0.7 + i * 0.45) * 0.6;
            const c = Math.sin(t * 1.3 + i * 0.15) * 0.4;
            const v = (a + b + c) / 2;
            return 0.25 + Math.abs(v) * 0.75;
          }),
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bars, speed, variant]);

  return (
    <div
      className="flex items-center gap-[2px] w-full"
      style={{ height }}
      aria-hidden
    >
      {vals.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-[height,opacity] duration-100 ease-out"
          style={{
            height: `${Math.max(8, v * 100)}%`,
            background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 60%, transparent))`,
            boxShadow: `0 0 6px ${color}, 0 0 12px color-mix(in oklab, ${color} 45%, transparent)`,
            opacity: 0.55 + v * 0.45,
          }}
        />
      ))}
    </div>
  );
}
