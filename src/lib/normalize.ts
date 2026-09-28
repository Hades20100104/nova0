/**
 * Normaliza texto para reconocimiento flexible:
 * - minúsculas
 * - sin acentos / diacríticos
 * - colapsa espacios
 * - sin signos de puntuación al inicio/fin
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Devuelve true si `text` contiene alguna de las variantes (todas comparadas
 * de forma normalizada).
 */
export function includesAny(text: string, variants: string[]): boolean {
  const t = normalize(text);
  return variants.some((v) => t.includes(normalize(v)));
}

/**
 * Detecta intención de un comando con sinónimos.
 */
export type Intent =
  | "whatsapp"
  | "music"
  | "image"
  | "youtube"
  | "google"
  | "reminder"
  | "analyze"
  | "rename"
  | null;

const INTENT_MAP: Record<Exclude<Intent, null>, string[]> = {
  whatsapp: ["whatsapp", "wasap", "wsp", "manda mensaje", "envia mensaje"],
  music: ["pon musica", "reproduce", "spotify", "playlist", "cancion"],
  image: ["genera imagen", "crea imagen", "dibuja", "imagina", "busca imagen", "busqueda de imagen", "imagen de"],
  youtube: ["busca en youtube", "youtube"],
  google: ["busca en google", "google", "buscar"],
  reminder: ["recuerdame", "recordatorio", "rutina", "agenda"],
  analyze: ["analiza", "resume archivo", "lee documento", "pdf", "docx"],
  rename: ["llamame", "cambia mi nombre", "mi nombre es"],
};

export function detectIntent(text: string): Intent {
  const t = normalize(text);
  for (const [intent, variants] of Object.entries(INTENT_MAP)) {
    if (variants.some((v) => t.includes(normalize(v)))) {
      return intent as Intent;
    }
  }
  return null;
}
