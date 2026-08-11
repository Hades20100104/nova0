/**
 * MERLIN — arquitectura de datos.
 * Estructuras preparadas para conectarse después a un backend real
 * (las tablas merlin_* ya existen en la base de datos).
 */

export type MerlinState =
  | "observando"
  | "ensenando"
  | "evaluando"
  | "investigando"
  | "adaptando"
  | "aprendiendo";

export type ConceptStatus = "dominado" | "en_desarrollo" | "requiere_atencion" | "no_iniciado";
export type Priority = "baja" | "media" | "alta" | "critica";
export type RelationKind = "prerrequisito" | "ayuda_a_comprender" | "se_utiliza_en" | "relacionado_con";
export type Mode = "aprender" | "practicar" | "repasar" | "evaluar" | "explorar" | "crear";
export type MapLayer = "curriculo" | "personal" | "combinado";

/** Importancia de una decisión → umbral mínimo de confianza. */
export type Importance = "baja" | "media" | "alta";
export const CONFIDENCE_THRESHOLD: Record<Importance, number> = { baja: 60, media: 70, alta: 80 };
export function meetsThreshold(confidence: number, importance: Importance) {
  return confidence >= CONFIDENCE_THRESHOLD[importance];
}

export type User = {
  id: string;
  name: string;
  level: string;
  goals: string[];
};

export type Subject = {
  id: string;
  name: string;
  curriculum: string;
};

export type Concept = {
  id: string;
  subjectId: string;
  name: string;
  /** Grupo curricular de referencia (lo que "debe existir"). */
  curriculumUnit: string;
  prerequisites: string[];
  difficulty: number; // 1..5
  /** Peso estructural: define el tamaño del nodo en el mapa. */
  weight: number; // 1..5
};

export type Relationship = {
  from: string;
  to: string;
  kind: RelationKind;
};

/** Dominio multidimensional: un 10/10 no implica dominio absoluto. */
export type Mastery = {
  comprension: number;
  aplicacion: number;
  transferencia: number;
  retencion: number;
  teoria: number;
  practica: number;
};

export type Evidence = {
  id: string;
  conceptId: string;
  type: "ejercicio" | "explicacion" | "examen" | "proyecto" | "recuerdo" | "observacion";
  result: "correcto" | "parcial" | "incorrecto";
  date: string;
  context: string;
  confidence: number;
};

export type Strategy = {
  id: string;
  type: string;
  result: "activa" | "efectiva" | "descartada";
  context: string;
  effectiveness: number; // 0..100
};

export type PersonalConcept = {
  conceptId: string;
  mastery: Mastery;
  /** Dominio general derivado (ponderado, no un promedio ingenuo). */
  overall: number;
  confidence: number;
  priority: Priority;
  status: ConceptStatus;
  strategyId: string;
  evidenceIds: string[];
  /** Subestructura creada por Merlin dentro del mapa personal. */
  breakdown?: string[];
  /** Posición en el universo de conocimiento (0..100). */
  x: number;
  y: number;
};

export type RouteStep = {
  id: string;
  conceptId: string;
  label: string;
  mode: Mode;
  minutes: number;
  reason: string;
  done: boolean;
};

export type LearningRoute = {
  id: string;
  subjectId: string;
  steps: RouteStep[];
  priority: Priority;
  reason: string;
  confidence: number;
  createdAt: string;
};

export type MemoryEntry = {
  id: string;
  type: "conocimiento" | "error_recurrente" | "estrategia_exitosa" | "estrategia_descartada" | "conclusion" | "evolucion";
  content: string;
  confidence: number;
  importance: Importance;
  lastUpdated: string;
};

/** Decisión auditable del motor de adaptación. */
export type Decision = {
  id: string;
  title: string;
  motive: string;
  evidence: string;
  confidence: number;
  action: string;
  expected: string;
  date: string;
  outcome: "observando" | "conservada" | "revertida";
};

export type MerlinDataset = {
  user: User;
  subject: Subject;
  concepts: Concept[];
  relationships: Relationship[];
  personal: PersonalConcept[];
  evidence: Evidence[];
  strategies: Strategy[];
  route: LearningRoute;
  memory: MemoryEntry[];
  decisions: Decision[];
};

export const STATUS_LABEL: Record<ConceptStatus, string> = {
  dominado: "Dominado",
  en_desarrollo: "En desarrollo",
  requiere_atencion: "Requiere atención",
  no_iniciado: "No iniciado",
};

export const RELATION_LABEL: Record<RelationKind, string> = {
  prerrequisito: "prerrequisito",
  ayuda_a_comprender: "ayuda a comprender",
  se_utiliza_en: "se utiliza en",
  relacionado_con: "relacionado con",
};

export const MODE_LABEL: Record<Mode, string> = {
  aprender: "Aprender",
  practicar: "Practicar",
  repasar: "Repasar",
  evaluar: "Evaluar",
  explorar: "Explorar",
  crear: "Crear",
};

/** Dominio general: la aplicación y la transferencia pesan más que la teoría. */
export function computeOverall(m: Mastery): number {
  const w = { comprension: 0.22, aplicacion: 0.26, transferencia: 0.2, retencion: 0.18, teoria: 0.06, practica: 0.08 };
  return Math.round(
    m.comprension * w.comprension +
      m.aplicacion * w.aplicacion +
      m.transferencia * w.transferencia +
      m.retencion * w.retencion +
      m.teoria * w.teoria +
      m.practica * w.practica,
  );
}
