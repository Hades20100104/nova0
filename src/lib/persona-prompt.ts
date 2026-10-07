// Server-safe (no React) persona directive builder used by /api/chat.

export type PersonaPayload = {
  personality?: string;
  customPersona?: string;
  style?: string;
  depth?: number;
  speed?: string;
  language?: string;
  emoji?: boolean;
};

const PERSONALITY_PROMPTS: Record<string, string> = {
  jarvis:
    "Personalidad JARVIS: mayordomo tecnológico, cortés, elegante, humor seco sutil, reporta estado como un sistema y anticipa necesidades.",
  amigable: "Personalidad cercana: cálida, conversacional, empática y motivadora.",
  mentor: "Personalidad mentor: preguntas socráticas, explica el porqué, propone siguientes pasos de aprendizaje.",
  analista: "Personalidad analista: datos, métricas, supuestos explícitos y riesgos. Cero adorno.",
  creativo: "Personalidad creativa: imaginativa, metafórica, generadora de opciones inesperadas pero útiles.",
};

const STYLE_PROMPTS: Record<string, string> = {
  conciso: "Estilo conciso: mínimo de palabras útiles.",
  bullets: "Estilo estructurado: viñetas y pasos numerados.",
  detallado: "Estilo detallado: contexto, ejemplos y matices.",
  narrativo: "Estilo narrativo: prosa fluida, evita listas salvo necesidad.",
  tecnico: "Estilo técnico: terminología precisa, código y especificaciones.",
};

const SPEED_PROMPTS: Record<string, string> = {
  rapida: "Ritmo rápido: responde ya, sin exploración larga ni herramientas innecesarias.",
  equilibrada: "Ritmo equilibrado entre profundidad y velocidad.",
  reflexiva: "Ritmo reflexivo: razona, verifica y contrasta antes de concluir; investiga si hace falta.",
};

const LANG_NAMES: Record<string, string> = {
  es: "español",
  en: "inglés",
  pt: "portugués",
  fr: "francés",
  it: "italiano",
  de: "alemán",
};

export function buildPersonaDirectives(p?: PersonaPayload): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.personality === "custom" && p.customPersona?.trim()) {
    lines.push(`Personalidad definida por el usuario: ${p.customPersona.trim().slice(0, 600)}`);
  } else if (p.personality && PERSONALITY_PROMPTS[p.personality]) {
    lines.push(PERSONALITY_PROMPTS[p.personality]);
  }
  if (p.style && STYLE_PROMPTS[p.style]) lines.push(STYLE_PROMPTS[p.style]);
  if (p.speed && SPEED_PROMPTS[p.speed]) lines.push(SPEED_PROMPTS[p.speed]);
  if (typeof p.depth === "number") {
    lines.push(
      `Nivel de profundidad ${p.depth}/5: ${
        p.depth <= 2
          ? "respuestas de superficie, directas."
          : p.depth === 3
            ? "profundidad media con lo esencial explicado."
            : "profundidad alta: fundamentos, alternativas y riesgos."
      }`,
    );
  }
  const lang = p.language && LANG_NAMES[p.language];
  if (lang) lines.push(`Responde siempre en ${lang}, salvo que el usuario escriba en otro idioma.`);
  lines.push(p.emoji ? "Puedes usar emojis con moderación." : "No uses emojis.");
  if (!lines.length) return "";
  return `\n\n### PREFERENCIAS DEL USUARIO (obligatorias)\n- ${lines.join("\n- ")}\n`;
}
