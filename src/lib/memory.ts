/**
 * Sistema de memoria local persistente del asistente.
 * (En la siguiente fase se sincronizará con Lovable Cloud por usuario.)
 */

const KEY = "assistant.memory.v1";

export interface AssistantMemory {
  /** Cómo quiere el usuario que la IA lo llame. Una vez fijado, NO se cambia
   *  hasta que el propio usuario pida cambiarlo explícitamente. */
  userName: string | null;
  /** Tema visual: "nevira" (día) o "nova" (noche). */
  theme: "nevira" | "nova";
  /** Notas que la IA va aprendiendo del usuario (preferencias, datos, etc.). */
  notes: string[];
  /** Historial de conversación (resumido). */
  conversationSummary: string;
  /** Fecha de creación */
  createdAt: string;
}

const DEFAULT: AssistantMemory = {
  userName: null,
  theme: "nova",
  notes: [],
  conversationSummary: "",
  createdAt: new Date().toISOString(),
};

export function loadMemory(): AssistantMemory {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function saveMemory(mem: AssistantMemory): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(mem));
}

export function updateMemory(patch: Partial<AssistantMemory>): AssistantMemory {
  const current = loadMemory();
  const next = { ...current, ...patch };
  saveMemory(next);
  return next;
}

export function addNote(note: string): AssistantMemory {
  const current = loadMemory();
  const notes = [...current.notes, note].slice(-50); // máx 50 notas
  const next = { ...current, notes };
  saveMemory(next);
  return next;
}

export function clearMemory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
