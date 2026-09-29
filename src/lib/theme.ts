import { useEffect, useState } from "react";

export type NovaTheme = "aurora" | "rose" | "forest" | "solar" | "mono";
export type NeviraTheme = "cyber" | "violet" | "ember" | "emerald" | "mono";
export type FontPreset = "sora" | "outfit" | "serif" | "mono";

export const NOVA_THEMES: { id: NovaTheme; label: string; swatch: string }[] = [
  { id: "aurora", label: "Aurora", swatch: "linear-gradient(135deg,#b026ff,#ff3df0)" },
  { id: "rose",   label: "Rosa Cósmica", swatch: "linear-gradient(135deg,#ff6b9a,#ffb178)" },
  { id: "forest", label: "Bosque Quántico", swatch: "linear-gradient(135deg,#1fb8b0,#8ad95a)" },
  { id: "solar",  label: "Solar", swatch: "linear-gradient(135deg,#ffb347,#ff6f3c)" },
  { id: "mono",   label: "Monocromo", swatch: "linear-gradient(135deg,#c9d4e6,#5b6478)" },
];
export const NEVIRA_THEMES: { id: NeviraTheme; label: string; swatch: string }[] = [
  { id: "cyber",   label: "Cyber", swatch: "linear-gradient(135deg,#22d3ee,#3b82f6)" },
  { id: "violet",  label: "Violeta Cuántico", swatch: "linear-gradient(135deg,#8b5cf6,#22d3ee)" },
  { id: "ember",   label: "Ember", swatch: "linear-gradient(135deg,#ff5a36,#ffb347)" },
  { id: "emerald", label: "Emerald", swatch: "linear-gradient(135deg,#10b981,#22d3ee)" },
  { id: "mono",    label: "Acero", swatch: "linear-gradient(135deg,#9ca3af,#475569)" },
];
export const FONT_PRESETS: { id: FontPreset; label: string; sample: string }[] = [
  { id: "sora",   label: "Sora",   sample: "Sora" },
  { id: "outfit", label: "Outfit", sample: "Outfit" },
  { id: "serif",  label: "Instrument Serif", sample: "Aa" },
  { id: "mono",   label: "JetBrains Mono",   sample: "{ }" },
];

export type Prefs = {
  nova: NovaTheme;
  nevira: NeviraTheme;
  font: FontPreset;
  glow: number;      // 0..100
  animation: number; // 0..100
};
const DEFAULT: Prefs = { nova: "aurora", nevira: "cyber", font: "sora", glow: 60, animation: 70 };
const KEY = "nv-prefs-v1";
const EVT = "nv-prefs-change";

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULT; }
}
export function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  applyIntensityVars(p);
  window.dispatchEvent(new Event(EVT));
}

export function applyIntensityVars(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--glow-strength", String(Math.max(0, Math.min(100, p.glow)) / 100));
  root.style.setProperty("--anim-speed", String(1 + (100 - Math.max(0, Math.min(100, p.animation))) / 60));
}

export function useTheme() {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  useEffect(() => {
    applyIntensityVars(prefs);
    const h = () => setPrefs(loadPrefs());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (patch: Partial<Prefs>) => savePrefs({ ...prefs, ...patch });
  return { prefs, update };
}

export function novaThemeClass(t: NovaTheme) { return `theme-pal-nova-${t}`; }
export function neviraThemeClass(t: NeviraTheme) { return `theme-nevira theme-pal-nevira-${t}`; }
export function fontClass(f: FontPreset) { return `font-pref-${f}`; }
