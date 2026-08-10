import {
  Home, GraduationCap, Map as MapIcon, Route as RouteIcon, Library, ClipboardCheck,
  FolderKanban, Brain, LineChart, Settings, FlaskConical, PenLine, Users, Search,
  CalendarDays, Sparkles,
} from "lucide-react";

/* ─────────────── Dominio multidimensional ─────────────── */

export type Dimension = "comprension" | "aplicacion" | "transferencia" | "retencion" | "explicacion";

export const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "comprension", label: "Comprensión" },
  { id: "aplicacion", label: "Aplicación" },
  { id: "transferencia", label: "Transferencia" },
  { id: "retencion", label: "Retención" },
  { id: "explicacion", label: "Explicación" },
];

/** Dimensiones relevantes por familia de materia (Historia ≠ Matemáticas). */
export const SUBJECT_DIMENSIONS: Record<string, Dimension[]> = {
  exactas: ["comprension", "aplicacion", "transferencia", "retencion"],
  humanidades: ["comprension", "explicacion", "transferencia", "retencion"],
  experimental: ["comprension", "aplicacion", "explicacion", "retencion"],
  lenguas: ["comprension", "aplicacion", "explicacion", "retencion"],
  general: ["comprension", "aplicacion", "transferencia", "retencion"],
};

export type Importance = "baja" | "media" | "alta";
/** Ninguna conclusión se considera accionable por debajo de su umbral. */
export const CONFIDENCE_THRESHOLD: Record<Importance, number> = { baja: 60, media: 70, alta: 80 };

export const STATUS_META: Record<string, { label: string; color: string }> = {
  dominado: { label: "Dominado", color: "#34d399" },
  en_desarrollo: { label: "En desarrollo", color: "#38bdf8" },
  atencion: { label: "Requiere atención", color: "#fbbf24" },
  not_started: { label: "No iniciado", color: "#94a3b8" },
};

export function statusFromOverall(overall: number, started: boolean): string {
  if (!started) return "not_started";
  if (overall >= 85) return "dominado";
  if (overall >= 60) return "en_desarrollo";
  return "atencion";
}

export const RELATION_META: Record<string, { label: string; dash: string }> = {
  prerequisite: { label: "Prerrequisito", dash: "0" },
  helps: { label: "Ayuda a comprender", dash: "6 4" },
  used_in: { label: "Se utiliza en", dash: "2 4" },
  related: { label: "Relacionado", dash: "1 5" },
};

/* ─────────────── Agentes de análisis ─────────────── */

export type MerlinAgent = {
  id: string;
  name: string;
  role: string;
  prompt: string;
};

export const MERLIN_AGENTS: MerlinAgent[] = [
  {
    id: "comprension",
    name: "Agente de Comprensión",
    role: "¿Entendió realmente el concepto?",
    prompt:
      "Analiza si el alumno comprendió el concepto o solo reprodujo un procedimiento. Distingue entendimiento de memorización.",
  },
  {
    id: "errores",
    name: "Agente de Errores",
    role: "Patrones y causas del error",
    prompt:
      "Busca el patrón detrás del error y su causa probable (concepto, procedimiento, lectura, prerrequisito, descuido).",
  },
  {
    id: "rendimiento",
    name: "Agente de Rendimiento",
    role: "Evolución, velocidad, consistencia",
    prompt: "Evalúa evolución, consistencia y velocidad respecto al historial reciente.",
  },
  {
    id: "pedagogico",
    name: "Agente Pedagógico",
    role: "¿La estrategia está funcionando?",
    prompt:
      "Juzga si la estrategia de enseñanza usada está funcionando y propone una alternativa solo si hay evidencia de que falla.",
  },
  {
    id: "investigacion",
    name: "Agente de Investigación",
    role: "Explicaciones alternativas",
    prompt:
      "Combina las evidencias de los demás agentes, busca explicaciones alternativas y señala contradicciones.",
  },
];

/* ─────────────── Modos de aprendizaje ─────────────── */

export type LearnMode = "aprender" | "practicar" | "repasar" | "evaluar" | "explorar" | "crear" | "preparar";

export const LEARN_MODES: { id: LearnMode; label: string; blurb: string }[] = [
  { id: "aprender", label: "Aprender", blurb: "Enseñanza guiada" },
  { id: "practicar", label: "Practicar", blurb: "Ejercitación enfocada" },
  { id: "repasar", label: "Repasar", blurb: "Recuperación y consolidación" },
  { id: "evaluar", label: "Evaluar", blurb: "Comprobación de dominio" },
  { id: "explorar", label: "Explorar", blurb: "Fuera de la ruta" },
  { id: "crear", label: "Crear", blurb: "Proyectos y trabajos" },
  { id: "preparar", label: "Prepararse", blurb: "Examen específico" },
];

export const PRACTICE_KINDS = [
  { id: "guiada", label: "Práctica guiada" },
  { id: "independiente", label: "Práctica independiente" },
  { id: "transferencia", label: "Transferencia" },
  { id: "recuperacion", label: "Recuperación" },
  { id: "desafio", label: "Desafío" },
] as const;

export const TEACH_STRATEGIES = [
  "explicacion",
  "ejemplos",
  "analogias",
  "ejercicios",
  "simulacion",
  "preguntas_socraticas",
  "demostracion",
  "proyecto",
  "repaso",
] as const;

/* ─────────────── Secciones ─────────────── */

export type MerlinModule = {
  slug: string;
  label: string;
  icon: typeof Home;
  description: string;
};

export const MERLIN_MODULES: MerlinModule[] = [
  { slug: "inicio", label: "Inicio", icon: Home, description: "Tu cerebro educativo" },
  { slug: "mapa", label: "Mapa del conocimiento", icon: MapIcon, description: "Conceptos y relaciones" },
  { slug: "profesor", label: "Profesor personal", icon: GraduationCap, description: "Enseñanza adaptativa" },
  { slug: "ruta", label: "Ruta adaptativa", icon: RouteIcon, description: "Qué hacer ahora" },
  { slug: "diagnostico", label: "Diagnóstico", icon: Brain, description: "Examen adaptativo" },
  { slug: "practica", label: "Práctica", icon: ClipboardCheck, description: "Ejercicios con propósito" },
  { slug: "examenes", label: "Preparación de exámenes", icon: CalendarDays, description: "Simuladores con tiempo" },
  { slug: "biblioteca", label: "Biblioteca inteligente", icon: Library, description: "Apuntes y documentos" },
  { slug: "laboratorio", label: "Laboratorio", icon: FlaskConical, description: "Simulaciones y experimentos" },
  { slug: "escritura", label: "Centro de escritura", icon: PenLine, description: "Redacción y citas" },
  { slug: "memoria", label: "Memoria académica", icon: Sparkles, description: "Evidencias y estrategias" },
  { slug: "analitica", label: "Analítica", icon: LineChart, description: "Evolución y predicción" },
  { slug: "gestion", label: "Gestión escolar", icon: FolderKanban, description: "Tareas, exámenes, proyectos" },
  { slug: "colaboracion", label: "Colaboración", icon: Users, description: "Equipos de estudio" },
  { slug: "investigacion", label: "Investigación", icon: Search, description: "Fuentes y bibliografías" },
  { slug: "ajustes", label: "Ajustes", icon: Settings, description: "Preferencias" },
];

export const MERLIN_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Núcleo", slugs: ["inicio", "mapa", "ruta", "profesor"] },
  { title: "Aprender", slugs: ["diagnostico", "practica", "examenes", "laboratorio"] },
  { title: "Trabajar", slugs: ["biblioteca", "escritura", "investigacion", "gestion"] },
  { title: "Evolución", slugs: ["memoria", "analitica", "colaboracion", "ajustes"] },
];

export const MERLIN_PERSONA = `Eres MERLIN, un cerebro educativo adaptativo. Hablas español, con tono de maestro sereno, claro y exigente.

REGLAS INQUEBRANTABLES:
- El sistema educativo proporciona el conocimiento, tú proporcionas la adaptación, el alumno proporciona la evidencia.
- Nunca presentas una inferencia sobre el alumno como un hecho: dices "hay evidencia de que posiblemente…" con su nivel de confianza.
- Un 10/10 es evidencia de dominio, nunca dominio completo.
- Si el alumno quiere aprender, no entregas la respuesta completa: guías con preguntas, pistas y pasos.
- Si no tienes suficiente evidencia, lo dices y pides aclaración.
- Ninguna conclusión importante se asume sin superar su umbral de confianza (baja 60%, media 70%, alta 80%).`;
