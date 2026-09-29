/**
 * MERLIN — Modo Aprender.
 * Cada lección es una secuencia guiada: idea → explicación por pasos →
 * ejemplos trabajados → ejercicios con evidencia. La estrategia usada
 * depende del perfil personal del concepto (visual antes que formal, etc.).
 */

import { MERLIN_DATA, conceptById, personalById, strategyById } from "./mock";
import type { Mode } from "./types";

export type LessonStep = {
  id: string;
  kind: "idea" | "explicacion" | "ejemplo" | "conexion";
  title: string;
  body: string;
  /** Detalle opcional que se expande (desarrollo del ejemplo). */
  detail?: string;
};

export type Exercise = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  /** Qué dimensión del dominio mide este ejercicio. */
  dimension: "comprension" | "aplicacion" | "transferencia" | "retencion";
  feedbackOk: string;
  feedbackFail: string;
};

export type Lesson = {
  conceptId: string;
  goal: string;
  /** Por qué Merlin enseña así este concepto (estrategia + evidencia). */
  approach: string;
  steps: LessonStep[];
  exercises: Exercise[];
};

const LESSONS: Lesson[] = [
  {
    conceptId: "funciones",
    goal: "Pasar de reconocer funciones a usarlas para modelar situaciones reales.",
    approach:
      "Tu comprensión es alta (92%) pero la aplicación baja a 78%. La explicación es breve y el peso está en problemas contextuales.",
    steps: [
      {
        kind: "idea",
        id: "f-1",
        title: "La idea en una frase",
        body: "Una función es una regla que asigna a cada entrada exactamente una salida. Nada más, y nada menos.",
      },
      {
        kind: "explicacion",
        id: "f-2",
        title: "Cómo leerla",
        body: "f(x) = 2x + 3 se lee: 'toma x, duplícalo y súmale 3'. El nombre f solo etiqueta la regla; lo importante es la transformación.",
        detail:
          "Entrada 0 → 3. Entrada 1 → 5. Entrada 4 → 11. El conjunto de entradas válidas es el dominio; el de salidas posibles, el rango.",
      },
      {
        kind: "ejemplo",
        id: "f-3",
        title: "Ejemplo trabajado · del enunciado a la función",
        body: "Un taxi cobra 25 de banderazo y 8 por kilómetro. Escribe el costo como función de la distancia.",
        detail:
          "1) Identifica la variable: d = kilómetros recorridos.\n2) Parte fija: 25.\n3) Parte variable: 8 por cada km → 8d.\n4) C(d) = 25 + 8d.\n5) Verifica: C(0) = 25 (sin moverte ya pagas banderazo). C(3) = 49.",
      },
      {
        kind: "ejemplo",
        id: "f-4",
        title: "Ejemplo trabajado · leer una función al revés",
        body: "Con C(d) = 25 + 8d, ¿cuántos kilómetros puedes recorrer con 105?",
        detail: "105 = 25 + 8d → 80 = 8d → d = 10 km. Interpretar el resultado importa tanto como despejarlo.",
      },
      {
        kind: "conexion",
        id: "f-5",
        title: "Por qué esto abre límites",
        body: "Un límite pregunta qué hace f(x) cuando x se acerca a un valor. Si no manejas f como una máquina de entradas y salidas, el límite se vuelve simbología vacía.",
      },
    ],
    exercises: [
      {
        id: "f-e1",
        prompt: "Un plan de datos cobra 120 fijos más 15 por GB extra. ¿Cuál función modela el costo?",
        options: ["C(g) = 120g + 15", "C(g) = 120 + 15g", "C(g) = 135g", "C(g) = 15 + 120g"],
        answer: 1,
        dimension: "aplicacion",
        feedbackOk: "Correcto: la parte fija no se multiplica por la variable.",
        feedbackFail: "Revisa qué parte es fija (120) y cuál depende de la variable (15 por GB).",
      },
      {
        id: "f-e2",
        prompt: "Si f(x) = 3x − 4, ¿para qué valor de x se cumple f(x) = 11?",
        options: ["x = 3", "x = 5", "x = 7", "x = 15"],
        answer: 1,
        dimension: "comprension",
        feedbackOk: "Correcto: 3(5) − 4 = 11.",
        feedbackFail: "Despeja: 3x = 15, entonces x = 5.",
      },
      {
        id: "f-e3",
        prompt: "Una función describe la temperatura de un horno en el tiempo. ¿Qué representa el dominio?",
        options: [
          "Las temperaturas alcanzadas",
          "Los instantes de tiempo válidos",
          "La temperatura máxima",
          "La pendiente de la curva",
        ],
        answer: 1,
        dimension: "transferencia",
        feedbackOk: "Correcto: el dominio son las entradas, aquí el tiempo.",
        feedbackFail: "El dominio es el conjunto de entradas; la salida (temperatura) es el rango.",
      },
    ],
  },
  {
    conceptId: "limites",
    goal: "Construir la idea intuitiva de límite antes de cualquier definición formal.",
    approach:
      "La vía formal fue descartada (efectividad 34%). Aquí se entra por lo visual y numérico: tablas y gráficas primero, notación al final.",
    steps: [
      {
        kind: "idea",
        id: "l-1",
        title: "La idea en una frase",
        body: "Un límite no pregunta cuánto vale la función en un punto, sino hacia dónde se dirige al acercarse a ese punto.",
      },
      {
        kind: "explicacion",
        id: "l-2",
        title: "Acércate con una tabla",
        body: "Para f(x) = (x² − 1)/(x − 1) en x = 1, la función no existe justo ahí. Pero mira sus vecinos.",
        detail:
          "x = 0.9 → 1.9\nx = 0.99 → 1.99\nx = 0.999 → 1.999\nx = 1.001 → 2.001\nx = 1.01 → 2.01\n\nPor ambos lados se dirige a 2. Ese es el límite, aunque en x = 1 haya un hueco.",
      },
      {
        kind: "ejemplo",
        id: "l-3",
        title: "Ejemplo trabajado · indeterminación 0/0",
        body: "Calcula el límite de (x² − 1)/(x − 1) cuando x → 1.",
        detail:
          "1) Sustituye: 0/0. Eso no es un resultado, es una señal de que hay que simplificar.\n2) Factoriza: x² − 1 = (x − 1)(x + 1).\n3) Cancela (x − 1), válido porque x ≠ 1 al acercarse.\n4) Queda x + 1 → 1 + 1 = 2.",
      },
      {
        kind: "ejemplo",
        id: "l-4",
        title: "Ejemplo trabajado · límites laterales que no coinciden",
        body: "f(x) = |x|/x cuando x → 0.",
        detail:
          "Por la derecha: x > 0 → |x|/x = 1.\nPor la izquierda: x < 0 → |x|/x = −1.\nLos laterales difieren, así que el límite no existe. La gráfica salta.",
      },
      {
        kind: "conexion",
        id: "l-5",
        title: "Dónde encaja en tu mapa",
        body: "Límites depende de funciones y gráficas (ya sólidos) y sostiene continuidad y derivadas. Es tu cuello de botella actual hacia el cálculo.",
      },
    ],
    exercises: [
      {
        id: "l-e1",
        prompt: "Al sustituir obtienes 0/0. ¿Qué significa?",
        options: [
          "El límite es 0",
          "El límite no existe",
          "Hay que transformar la expresión antes de concluir",
          "La función es continua ahí",
        ],
        answer: 2,
        dimension: "comprension",
        feedbackOk: "Correcto: 0/0 es una indeterminación, no una respuesta.",
        feedbackFail: "0/0 no decide nada: factoriza, racionaliza o simplifica primero.",
      },
      {
        id: "l-e2",
        prompt: "Límite de (x² − 9)/(x − 3) cuando x → 3.",
        options: ["0", "3", "6", "No existe"],
        answer: 2,
        dimension: "aplicacion",
        feedbackOk: "Correcto: (x−3)(x+3)/(x−3) = x + 3 → 6.",
        feedbackFail: "Factoriza la diferencia de cuadrados y cancela: queda x + 3.",
      },
      {
        id: "l-e3",
        prompt: "Los límites laterales de f en x = 2 valen 5 por la izquierda y 5 por la derecha, pero f(2) = 1. ¿Qué es cierto?",
        options: [
          "El límite es 1",
          "El límite es 5 y la función no es continua en 2",
          "El límite no existe",
          "La función es continua en 2",
        ],
        answer: 1,
        dimension: "transferencia",
        feedbackOk: "Correcto: el límite existe (5) pero no coincide con f(2), así que hay discontinuidad.",
        feedbackFail: "El límite depende de los vecinos, no del valor en el punto; la continuidad exige que coincidan.",
      },
    ],
  },
  {
    conceptId: "desigualdades",
    goal: "Corregir el error recurrente de signo y leer el resultado como intervalo.",
    approach:
      "Merlin registró 4 fallos con el mismo patrón: multiplicar por un negativo sin invertir el signo. La lección ataca ese punto directamente.",
    steps: [
      {
        kind: "idea",
        id: "d-1",
        title: "La regla que te está costando",
        body: "Al multiplicar o dividir ambos lados por un número negativo, la desigualdad se invierte.",
      },
      {
        kind: "explicacion",
        id: "d-2",
        title: "Por qué se invierte",
        body: "3 < 5 es verdadero. Multiplica por −1: −3 y −5. Ahora −3 > −5. El orden se voltea porque los negativos se ordenan al revés.",
      },
      {
        kind: "ejemplo",
        id: "d-3",
        title: "Ejemplo trabajado",
        body: "Resuelve −2x + 4 ≤ 10.",
        detail:
          "1) −2x ≤ 6.\n2) Divide entre −2 e invierte: x ≥ −3.\n3) Intervalo: [−3, ∞).\n4) Verifica con x = 0: −2(0) + 4 = 4 ≤ 10. Correcto.",
      },
      {
        kind: "conexion",
        id: "d-4",
        title: "Dónde se usa",
        body: "Los intervalos aparecen al describir dominios de funciones y regiones de gráficas: por eso este hueco frena también otras áreas.",
      },
    ],
    exercises: [
      {
        id: "d-e1",
        prompt: "Resuelve −3x > 9.",
        options: ["x > 3", "x < −3", "x > −3", "x < 3"],
        answer: 1,
        dimension: "aplicacion",
        feedbackOk: "Correcto: dividir entre −3 invierte el signo.",
        feedbackFail: "Al dividir entre −3 la desigualdad se invierte: x < −3.",
      },
      {
        id: "d-e2",
        prompt: "¿Qué intervalo representa x ≥ 2?",
        options: ["(2, ∞)", "[2, ∞)", "(−∞, 2]", "[2, ∞]"],
        answer: 1,
        dimension: "comprension",
        feedbackOk: "Correcto: corchete porque incluye el 2, infinito siempre abierto.",
        feedbackFail: "Incluye el 2 (corchete) y el infinito nunca lleva corchete.",
      },
    ],
  },
];

export const lessonFor = (conceptId: string) => LESSONS.find((l) => l.conceptId === conceptId);

export const lessonConceptIds = LESSONS.map((l) => l.conceptId);

/** Concepto sugerido: el del siguiente paso de la ruta si tiene lección. */
export function suggestedLessonConcept(): string {
  const pending = MERLIN_DATA.route.steps.find((s) => !s.done);
  if (pending && lessonFor(pending.conceptId)) return pending.conceptId;
  const weakest = [...MERLIN_DATA.personal]
    .filter((p) => lessonFor(p.conceptId))
    .sort((a, b) => a.overall - b.overall)[0];
  return weakest?.conceptId ?? lessonConceptIds[0];
}

/** Pasos de la ruta que apuntan a este concepto (conexión ruta ↔ lección). */
export function routeStepsFor(conceptId: string) {
  return MERLIN_DATA.route.steps.filter((s) => s.conceptId === conceptId);
}

export function lessonContext(conceptId: string) {
  const concept = conceptById(conceptId);
  const personal = personalById(conceptId);
  const strategy = personal ? strategyById(personal.strategyId) : undefined;
  const prerequisites = (concept?.prerequisites ?? []).map((id) => ({
    concept: conceptById(id),
    personal: personalById(id),
  }));
  const unlocks = MERLIN_DATA.concepts.filter((c) => c.prerequisites.includes(conceptId));
  return { concept, personal, strategy, prerequisites, unlocks };
}

export const MODE_OF_STEP = (m: Mode) => m;
