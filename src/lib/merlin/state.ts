import { useEffect, useState } from "react";
import type { MerlinState } from "./types";

export const MERLIN_STATE_LABEL: Record<MerlinState, string> = {
  observando: "Observando",
  ensenando: "Enseñando",
  evaluando: "Evaluando",
  investigando: "Investigando",
  adaptando: "Adaptando",
  aprendiendo: "Aprendiendo",
};

/** Frase de estado que acompaña al núcleo. */
export const MERLIN_STATE_HINT: Record<MerlinState, string> = {
  observando: "Recogiendo evidencia de tu trabajo reciente",
  ensenando: "Construyendo la explicación para tu forma de entender",
  evaluando: "Contrastando tus respuestas con el modelo actual",
  investigando: "Buscando la causa del estancamiento",
  adaptando: "Reorganizando tu ruta con la nueva evidencia",
  aprendiendo: "Incorporando estructuras nuevas a tu mapa",
};

export type MerlinView = "nucleo" | "aprender" | "mapa" | "ruta" | "conversar" | "progreso" | "memoria" | "analisis";

export type MerlinContext = "inicio" | "estudiando" | "evaluando" | "explorando";

/** El menú es contextual: solo aparece lo relevante ahora mismo. */
export const CONTEXT_MENU: Record<MerlinContext, { view: MerlinView; label: string }[]> = {
  inicio: [
    { view: "aprender", label: "Aprender" },
    { view: "mapa", label: "Mapa" },
    { view: "ruta", label: "Ruta" },
    { view: "conversar", label: "Conversar" },
    { view: "progreso", label: "Progreso" },
    { view: "memoria", label: "Memoria" },
    { view: "analisis", label: "Análisis" },
  ],
  estudiando: [
    { view: "mapa", label: "Mapa" },
    { view: "aprender", label: "Concepto" },
    { view: "conversar", label: "Explicación" },
    { view: "ruta", label: "Añadir a ruta" },
  ],
  evaluando: [
    { view: "aprender", label: "Pregunta" },
    { view: "memoria", label: "Evidencia" },
    { view: "progreso", label: "Progreso" },
    { view: "nucleo", label: "Finalizar" },
  ],
  explorando: [
    { view: "mapa", label: "Buscar" },
    { view: "mapa", label: "Relaciones" },
    { view: "memoria", label: "Guardar" },
    { view: "ruta", label: "Crear ruta" },
  ],
};

/**
 * Estado cognitivo compartido. Las transiciones representan procesos reales
 * (analizar, enseñar, adaptar), no decoración.
 */
let current: MerlinState = "observando";
const listeners = new Set<(s: MerlinState) => void>();

export function setMerlinState(s: MerlinState) {
  current = s;
  listeners.forEach((l) => l(s));
}

/** Entra en un estado temporalmente y vuelve a observar. */
export function pulseMerlinState(s: MerlinState, ms = 2600) {
  setMerlinState(s);
  setTimeout(() => setMerlinState("observando"), ms);
}

export function useMerlinState() {
  const [state, setState] = useState<MerlinState>(current);
  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return { state, setState: setMerlinState, pulse: pulseMerlinState };
}
