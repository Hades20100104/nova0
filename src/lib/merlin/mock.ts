import {
  computeOverall,
  type Concept,
  type Decision,
  type Evidence,
  type LearningRoute,
  type MemoryEntry,
  type MerlinDataset,
  type PersonalConcept,
  type Relationship,
  type Strategy,
} from "./types";

const subjectId = "mat";

const concepts: Concept[] = [
  { id: "reales", subjectId, name: "Números reales", curriculumUnit: "Unidad 1 · Fundamentos", prerequisites: [], difficulty: 1, weight: 5 },
  { id: "algebra", subjectId, name: "Álgebra", curriculumUnit: "Unidad 1 · Fundamentos", prerequisites: ["reales"], difficulty: 2, weight: 5 },
  { id: "ecuaciones", subjectId, name: "Ecuaciones", curriculumUnit: "Unidad 2 · Relaciones", prerequisites: ["algebra"], difficulty: 2, weight: 4 },
  { id: "desigualdades", subjectId, name: "Desigualdades", curriculumUnit: "Unidad 2 · Relaciones", prerequisites: ["algebra"], difficulty: 3, weight: 3 },
  { id: "funciones", subjectId, name: "Funciones", curriculumUnit: "Unidad 3 · Funciones", prerequisites: ["ecuaciones"], difficulty: 3, weight: 5 },
  { id: "graficas", subjectId, name: "Gráficas", curriculumUnit: "Unidad 3 · Funciones", prerequisites: ["funciones"], difficulty: 2, weight: 3 },
  { id: "limites", subjectId, name: "Límites", curriculumUnit: "Unidad 4 · Cálculo", prerequisites: ["funciones", "graficas"], difficulty: 4, weight: 4 },
  { id: "continuidad", subjectId, name: "Continuidad", curriculumUnit: "Unidad 4 · Cálculo", prerequisites: ["limites"], difficulty: 4, weight: 3 },
  { id: "derivadas", subjectId, name: "Derivadas", curriculumUnit: "Unidad 4 · Cálculo", prerequisites: ["limites", "continuidad"], difficulty: 5, weight: 5 },
];

const relationships: Relationship[] = [
  { from: "reales", to: "algebra", kind: "prerrequisito" },
  { from: "algebra", to: "ecuaciones", kind: "prerrequisito" },
  { from: "algebra", to: "desigualdades", kind: "prerrequisito" },
  { from: "ecuaciones", to: "funciones", kind: "prerrequisito" },
  { from: "funciones", to: "graficas", kind: "se_utiliza_en" },
  { from: "graficas", to: "limites", kind: "ayuda_a_comprender" },
  { from: "funciones", to: "limites", kind: "prerrequisito" },
  { from: "limites", to: "continuidad", kind: "prerrequisito" },
  { from: "continuidad", to: "derivadas", kind: "prerrequisito" },
  { from: "limites", to: "derivadas", kind: "prerrequisito" },
  { from: "desigualdades", to: "graficas", kind: "relacionado_con" },
  { from: "reales", to: "desigualdades", kind: "ayuda_a_comprender" },
];

const strategies: Strategy[] = [
  { id: "s-conceptual", type: "Explicación conceptual + ejercicios guiados", result: "efectiva", context: "Conceptos abstractos nuevos", effectiveness: 84 },
  { id: "s-visual", type: "Representación visual antes que formal", result: "efectiva", context: "Gráficas y funciones", effectiveness: 91 },
  { id: "s-contextual", type: "Práctica contextual con problemas reales", result: "activa", context: "Baja aplicación con alta comprensión", effectiveness: 72 },
  { id: "s-espaciado", type: "Recuperación espaciada", result: "activa", context: "Retención de fundamentos", effectiveness: 78 },
  { id: "s-formal", type: "Definición formal primero", result: "descartada", context: "Introducción de límites", effectiveness: 34 },
];

function ev(id: string, conceptId: string, type: Evidence["type"], result: Evidence["result"], date: string, context: string, confidence: number): Evidence {
  return { id, conceptId, type, result, date, context, confidence };
}

const evidence: Evidence[] = [
  ev("e1", "funciones", "ejercicio", "correcto", "2026-08-09", "Dominio y rango", 88),
  ev("e2", "funciones", "ejercicio", "correcto", "2026-08-09", "Evaluación de funciones", 90),
  ev("e3", "funciones", "ejercicio", "incorrecto", "2026-08-10", "Interpretación en contexto", 71),
  ev("e4", "funciones", "explicacion", "correcto", "2026-08-10", "Explicó con sus palabras", 86),
  ev("e5", "limites", "ejercicio", "parcial", "2026-08-10", "Límites laterales", 64),
  ev("e6", "limites", "ejercicio", "incorrecto", "2026-08-10", "Indeterminaciones 0/0", 58),
  ev("e7", "graficas", "ejercicio", "correcto", "2026-08-08", "Lectura de gráficas", 92),
  ev("e8", "desigualdades", "examen", "parcial", "2026-08-06", "Intervalos y signos", 61),
  ev("e9", "algebra", "recuerdo", "correcto", "2026-08-07", "Factorización a 14 días", 89),
  ev("e10", "derivadas", "observacion", "parcial", "2026-08-11", "Curiosidad espontánea", 45),
];

type P = {
  id: string;
  m: [number, number, number, number, number, number];
  confidence: number;
  priority: PersonalConcept["priority"];
  status: PersonalConcept["status"];
  strategyId: string;
  x: number;
  y: number;
  breakdown?: string[];
};

const raw: P[] = [
  { id: "reales", m: [96, 94, 90, 92, 95, 93], confidence: 93, priority: "baja", status: "dominado", strategyId: "s-espaciado", x: 12, y: 22 },
  { id: "algebra", m: [93, 90, 84, 88, 92, 89], confidence: 90, priority: "baja", status: "dominado", strategyId: "s-espaciado", x: 24, y: 48 },
  { id: "ecuaciones", m: [90, 86, 78, 82, 88, 85], confidence: 86, priority: "baja", status: "dominado", strategyId: "s-conceptual", x: 38, y: 30 },
  { id: "desigualdades", m: [68, 54, 48, 57, 66, 52], confidence: 63, priority: "alta", status: "requiere_atencion", strategyId: "s-contextual", x: 34, y: 72 },
  {
    id: "funciones",
    m: [92, 78, 71, 83, 90, 80],
    confidence: 89,
    priority: "media",
    status: "dominado",
    strategyId: "s-conceptual",
    x: 54,
    y: 46,
    breakdown: ["Concepto", "Dominio y rango", "Representación gráfica", "Interpretación"],
  },
  { id: "graficas", m: [88, 82, 74, 79, 84, 86], confidence: 85, priority: "baja", status: "en_desarrollo", strategyId: "s-visual", x: 62, y: 74 },
  { id: "limites", m: [61, 44, 38, 47, 58, 42], confidence: 66, priority: "critica", status: "requiere_atencion", strategyId: "s-visual", x: 76, y: 38, breakdown: ["Idea intuitiva", "Límites laterales", "Indeterminaciones"] },
  { id: "continuidad", m: [34, 22, 18, 25, 30, 20], confidence: 48, priority: "media", status: "en_desarrollo", strategyId: "s-visual", x: 88, y: 62 },
  { id: "derivadas", m: [8, 4, 2, 5, 6, 3], confidence: 31, priority: "baja", status: "no_iniciado", strategyId: "s-conceptual", x: 92, y: 20 },
];

const personal: PersonalConcept[] = raw.map((p) => {
  const mastery = {
    comprension: p.m[0],
    aplicacion: p.m[1],
    transferencia: p.m[2],
    retencion: p.m[3],
    teoria: p.m[4],
    practica: p.m[5],
  };
  return {
    conceptId: p.id,
    mastery,
    overall: computeOverall(mastery),
    confidence: p.confidence,
    priority: p.priority,
    status: p.status,
    strategyId: p.strategyId,
    evidenceIds: evidence.filter((e) => e.conceptId === p.id).map((e) => e.id),
    breakdown: p.breakdown,
    x: p.x,
    y: p.y,
  };
});

const route: LearningRoute = {
  id: "r1",
  subjectId,
  createdAt: "2026-08-11T07:10:00Z",
  priority: "alta",
  confidence: 84,
  reason:
    "Tu comprensión de funciones es sólida (92%) pero la aplicación cae a 78%. Límites depende de esa aplicación y hoy es el cuello de botella real de tu avance hacia derivadas.",
  steps: [
    { id: "st1", conceptId: "funciones", label: "Repasar funciones en contexto", mode: "repasar", minutes: 8, reason: "Reactivar antes de aplicar", done: true },
    { id: "st2", conceptId: "funciones", label: "Resolver 3 problemas aplicados", mode: "practicar", minutes: 15, reason: "La aplicación es la dimensión más baja", done: true },
    { id: "st3", conceptId: "funciones", label: "Comprobar comprensión", mode: "evaluar", minutes: 5, reason: "Confirmar antes de avanzar", done: false },
    { id: "st4", conceptId: "limites", label: "Introducción visual a límites", mode: "aprender", minutes: 18, reason: "La vía formal fue descartada por baja efectividad", done: false },
    { id: "st5", conceptId: "limites", label: "Evaluación breve de límites laterales", mode: "evaluar", minutes: 10, reason: "Generar evidencia nueva", done: false },
  ],
};

const memory: MemoryEntry[] = [
  { id: "m1", type: "conocimiento", content: "Domina factorización y manipulación algebraica con retención alta a 14 días.", confidence: 91, importance: "media", lastUpdated: "2026-08-07" },
  { id: "m2", type: "error_recurrente", content: "Confunde el signo al multiplicar desigualdades por números negativos (4 apariciones).", confidence: 87, importance: "alta", lastUpdated: "2026-08-06" },
  { id: "m3", type: "error_recurrente", content: "Traduce mal enunciados verbales a expresiones funcionales.", confidence: 74, importance: "media", lastUpdated: "2026-08-10" },
  { id: "m4", type: "estrategia_exitosa", content: "Ver la representación gráfica antes de la definición formal acelera la comprensión.", confidence: 91, importance: "alta", lastUpdated: "2026-08-08" },
  { id: "m5", type: "estrategia_descartada", content: "Empezar por la definición formal de límite: efectividad 34%, generó bloqueo.", confidence: 82, importance: "media", lastUpdated: "2026-08-10" },
  { id: "m6", type: "conclusion", content: "Hipótesis: aprende mejor desde lo visual y concreto hacia lo formal. Revisable con nueva evidencia.", confidence: 79, importance: "alta", lastUpdated: "2026-08-11" },
  { id: "m7", type: "evolucion", content: "Su comprensión sube más rápido que su aplicación; la brecha se mantiene ~14 puntos desde julio.", confidence: 76, importance: "media", lastUpdated: "2026-08-11" },
];

const decisions: Decision[] = [
  {
    id: "d1",
    title: "Cambio de ruta detectado",
    motive: "Dificultad persistente en aplicación.",
    evidence: "7 ejercicios recientes con comprensión alta y aplicación baja.",
    confidence: 84,
    action: "Añadir práctica contextual antes de avanzar a límites.",
    expected: "Comprobar si la aplicación mejora por encima de 85%.",
    date: "2026-08-11",
    outcome: "observando",
  },
  {
    id: "d2",
    title: "Estrategia descartada",
    motive: "La vía formal en límites no producía avance.",
    evidence: "3 sesiones sin mejora medible y 2 abandonos de sesión.",
    confidence: 81,
    action: "Sustituir por introducción visual e intuitiva.",
    expected: "Recuperar progreso en 2 sesiones.",
    date: "2026-08-10",
    outcome: "conservada",
  },
  {
    id: "d3",
    title: "Reorganización conceptual",
    motive: "Funciones se comportaba como un bloque demasiado grande.",
    evidence: "Errores concentrados solo en interpretación, no en el concepto.",
    confidence: 77,
    action: "Dividir en 4 subconceptos dentro del mapa personal.",
    expected: "Aislar la dimensión que falla sin repetir lo ya dominado.",
    date: "2026-08-09",
    outcome: "conservada",
  },
  {
    id: "d4",
    title: "Prioridad no modificada",
    motive: "Existía una alternativa aparentemente mejor para el orden de estudio.",
    evidence: "La ruta actual sigue produciendo progreso sostenido.",
    confidence: 88,
    action: "Conservar la ruta (regla de estabilidad).",
    expected: "Evitar cambios sin evidencia de fallo.",
    date: "2026-08-08",
    outcome: "conservada",
  },
];

export const MERLIN_DATA: MerlinDataset = {
  user: { id: "u1", name: "Alumno", level: "Preparatoria · Matemáticas IV", goals: ["Llegar a derivadas con base sólida", "Cerrar la brecha de aplicación"] },
  subject: { id: subjectId, name: "Matemáticas", curriculum: "Currículo de referencia · Matemáticas I–IV" },
  concepts,
  relationships,
  personal,
  evidence,
  strategies,
  route,
  memory,
  decisions,
};

/* ---------- selectores ---------- */

export const conceptById = (id: string) => MERLIN_DATA.concepts.find((c) => c.id === id);
export const personalById = (id: string) => MERLIN_DATA.personal.find((p) => p.conceptId === id);
export const strategyById = (id: string) => MERLIN_DATA.strategies.find((s) => s.id === id);
export const evidenceOf = (id: string) => MERLIN_DATA.evidence.filter((e) => e.conceptId === id);
export const relationsOf = (id: string) =>
  MERLIN_DATA.relationships.filter((r) => r.from === id || r.to === id);

export function globalProgress() {
  const total = MERLIN_DATA.personal.reduce((a, p) => a + p.overall, 0);
  return Math.round(total / MERLIN_DATA.personal.length);
}

export function nextStep() {
  return MERLIN_DATA.route.steps.find((s) => !s.done) ?? MERLIN_DATA.route.steps[MERLIN_DATA.route.steps.length - 1];
}
