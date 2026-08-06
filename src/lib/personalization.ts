import { useEffect, useState } from "react";

/* ---------------- Types ---------------- */

export type PersonalityId =
  | "jarvis"
  | "amigable"
  | "mentor"
  | "analista"
  | "creativo"
  | "custom";

export type StyleId = "conciso" | "bullets" | "detallado" | "narrativo" | "tecnico";
export type SpeedId = "rapida" | "equilibrada" | "reflexiva";

export type CustomTheme = {
  id: string;
  label: string;
  primary: string;
  accent: string;
  glow: string;
  aura: string;
};

export type WidgetKind = "note" | "clock" | "counter" | "progress" | "quote" | "prompt";

export type CustomWidget = {
  id: string;
  title: string;
  kind: WidgetKind;
  text?: string;
  value?: number;
  target?: number;
  source?: "images" | "documents" | "memory" | "threads" | "tasks";
  seed?: string;
  accent?: string;
};

export type PersonaPrefs = {
  personality: PersonalityId;
  customPersona: string;
  style: StyleId;
  depth: number; // 1..5
  speed: SpeedId;
  language: string; // es, en, fr...
  emoji: boolean;
  customThemes: CustomTheme[];
  activeCustomTheme: string | null;
  widgets: CustomWidget[];
};

export const PERSONALITIES: { id: PersonalityId; label: string; blurb: string; prompt: string }[] = [
  {
    id: "jarvis",
    label: "JARVIS",
    blurb: "Mayordomo tecnológico, elegante y preciso",
    prompt:
      "Adopta una personalidad tipo JARVIS: mayordomo tecnológico, cortés, elegante, con humor seco muy sutil. Trata al usuario con respeto ('señor/a' solo ocasionalmente). Anticipa necesidades y reporta estado como un sistema.",
  },
  {
    id: "amigable",
    label: "Cercano",
    blurb: "Cálido, conversacional, motivador",
    prompt:
      "Adopta una personalidad cálida y cercana: conversacional, empática, motivadora. Usa lenguaje natural y celebra los avances del usuario.",
  },
  {
    id: "mentor",
    label: "Mentor",
    blurb: "Guía, pregunta, enseña",
    prompt:
      "Adopta una personalidad de mentor: haz preguntas socráticas, explica el porqué de cada recomendación y propone siguientes pasos de aprendizaje.",
  },
  {
    id: "analista",
    label: "Analista",
    blurb: "Datos, métricas, cero adorno",
    prompt:
      "Adopta una personalidad de analista: prioriza datos, métricas, supuestos explícitos y riesgos. Nada de adornos.",
  },
  {
    id: "creativo",
    label: "Creativo",
    blurb: "Imaginativo, metafórico, provocador",
    prompt:
      "Adopta una personalidad creativa: imaginativa, metafórica, generadora de opciones inesperadas, sin perder utilidad práctica.",
  },
  { id: "custom", label: "Personalizada", blurb: "Tú la escribes", prompt: "" },
];

export const STYLES: { id: StyleId; label: string; prompt: string }[] = [
  { id: "conciso", label: "Conciso", prompt: "Responde en el mínimo de palabras útiles." },
  { id: "bullets", label: "Bullets", prompt: "Estructura siempre en viñetas y pasos numerados." },
  { id: "detallado", label: "Detallado", prompt: "Da contexto, ejemplos y matices." },
  { id: "narrativo", label: "Narrativo", prompt: "Responde en prosa fluida, sin listas salvo que sea necesario." },
  { id: "tecnico", label: "Técnico", prompt: "Usa terminología precisa, código y especificaciones cuando aplique." },
];

export const SPEEDS: { id: SpeedId; label: string; prompt: string }[] = [
  { id: "rapida", label: "Rápida", prompt: "Prioriza velocidad: respuestas breves, sin exploración larga." },
  { id: "equilibrada", label: "Equilibrada", prompt: "Equilibra profundidad y velocidad." },
  { id: "reflexiva", label: "Reflexiva", prompt: "Tómate el tiempo de razonar, verificar y contrastar antes de responder." },
];

export const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "pt", label: "Português" },
  { id: "fr", label: "Français" },
  { id: "it", label: "Italiano" },
  { id: "de", label: "Deutsch" },
];

const DEFAULT: PersonaPrefs = {
  personality: "jarvis",
  customPersona: "",
  style: "bullets",
  depth: 3,
  speed: "equilibrada",
  language: "es",
  emoji: false,
  customThemes: [],
  activeCustomTheme: null,
  widgets: [],
};

const KEY = "nv-persona-v1";
const EVT = "nv-persona-change";

export function loadPersona(): PersonaPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULT;
  }
}

export function savePersona(p: PersonaPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  applyCustomTheme(p);
  window.dispatchEvent(new Event(EVT));
}

export function applyCustomTheme(p: PersonaPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const theme = p.customThemes.find((t) => t.id === p.activeCustomTheme);
  const vars = ["--primary", "--accent", "--glow", "--aura"];
  if (!theme) {
    vars.forEach((v) => root.style.removeProperty(v));
    return;
  }
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--glow", theme.glow);
  root.style.setProperty("--aura", theme.aura);
}

export function usePersona() {
  const [persona, setPersona] = useState<PersonaPrefs>(() => loadPersona());
  useEffect(() => {
    applyCustomTheme(persona);
    const h = () => setPersona(loadPersona());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (patch: Partial<PersonaPrefs>) => savePersona({ ...loadPersona(), ...patch });
  return { persona, update };
}

/** Compact payload sent to the chat endpoint. */
export function personaPayload(p: PersonaPrefs) {
  return {
    personality: p.personality,
    customPersona: p.customPersona.slice(0, 600),
    style: p.style,
    depth: p.depth,
    speed: p.speed,
    language: p.language,
    emoji: p.emoji,
  };
}
