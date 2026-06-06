import { useRef, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  active?: boolean;
  style?: CSSProperties;
  intensity?: number; // 0..1 tilt strength
};

/**
 * 3D icon wrapper with pointer-tracking tilt + dynamic radial light.
 * Uses CSS vars --rx --ry --mx --my updated on pointer move.
 */
export function Icon3D({ children, className = "", active = false, style, intensity = 1 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const ry = (x - 0.5) * 22 * intensity;
    const rx = -(y - 0.5) * 22 * intensity;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
    el.style.setProperty("--mx", `50%`);
    el.style.setProperty("--my", `50%`);
  };

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`icon-3d icon-3d-tilt ${active ? "is-active" : ""} ${className}`}
      style={style}
    >
      {children}
      <span className="icon-3d-light" aria-hidden />
    </span>
  );
}
