import type { UIMessage } from "ai";
import type { CognitiveIntent, TaskDomain } from "./types";

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function messageText(message: UIMessage | undefined): string {
  return (
    message?.parts
      .filter((p) => p.type === "text")
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("\n") ?? ""
  );
}

const RULES: Array<{ domain: TaskDomain; pattern: RegExp; skills: string[] }> = [
  {
    domain: "music",
    pattern: /\b(spotify|musica|cancion\w*|playlist\w*|dj|song\w*|music|track\w*)\b/,
    skills: ["search_music"],
  },
  {
    domain: "image",
    pattern: /\b(imagen\w*|foto\w*|dibuja\w*|logo\w*|image\w*|picture)\b/,
    skills: ["generate_image"],
  },
  {
    domain: "document",
    pattern: /\b(document\w*|pdf|word|excel|powerpoint|informe\w*|report\w*|pptx|docx|xlsx)\b/,
    skills: ["save_document", "generate_office_document"],
  },
  {
    domain: "code",
    pattern: /\b(codigo|programa\w*|componente\w*|react|html|script|code|debug|app)\b/,
    skills: ["generate_component"],
  },
  {
    domain: "calendar",
    pattern:
      /\b(calendario|agenda\w*|evento\w*|reunion\w*|horario\w*|disponibilidad|semana|examen\w*|estudio|calendar|meeting\w*|event\w*|schedule|week|exam\w*)\b/,
    skills: ["list_events", "create_event"],
  },
  {
    domain: "finance",
    pattern:
      /\b(finanza\w*|ingreso\w*|gasto\w*|presupuesto\w*|dinero|ahorro\w*|finance\w*|budget\w*|expense\w*)\b/,
    skills: ["finance_summary", "add_transaction"],
  },
  {
    domain: "productivity",
    pattern:
      /\b(tarea\w*|proyecto\w*|productividad|objetivo\w*|habito\w*|examen\w*|estudio|task\w*|project\w*|goal\w*|exam\w*)\b/,
    skills: ["list_tasks", "add_task", "create_plan"],
  },
  {
    domain: "automation",
    pattern: /\b(automatiza\w*|rutina\w*|flujo\w*|automation\w*|workflow\w*)\b/,
    skills: ["list_automations", "create_automation"],
  },
  {
    domain: "memory",
    pattern: /\b(recuerda\w*|recuerdo\w*|memoria|preferencia\w*|remember|recall|memory)\b/,
    skills: ["recall", "remember"],
  },
  {
    domain: "communication",
    pattern: /\b(whatsapp|mensaje\w*|sala\w*|contacto\w*|message\w*|room\w*)\b/,
    skills: ["send_whatsapp", "list_rooms", "send_room_message"],
  },
  {
    domain: "research",
    pattern:
      /\b(investiga\w*|analiza\w*|tendencia\w*|noticia\w*|actualidad|research|analy\w*|trend\w*|news)\b/,
    skills: ["web_search", "analyze_topic"],
  },
];
const MODULE_DOMAIN: Record<string, TaskDomain> = {
  musica: "music",
  imagenes: "image",
  documentos: "document",
  datos: "document",
  codigo: "code",
  calendario: "calendar",
  finanzas: "finance",
  productividad: "productivity",
  automatizaciones: "automation",
  memoria: "memory",
  comunicacion: "communication",
  whatsapp: "communication",
  analisis: "research",
};

/** Deterministic, bounded preflight; never invokes tools or grants capabilities. */
export function classifyIntent(messages: UIMessage[], module: string): CognitiveIntent {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = messageText(lastUser).trim().slice(0, 6000);
  const query = normalize(text);
  const followUp = /^(si|yes|hazlo|continua|continue|eso|lo mismo|otra|otro|dale)\b/.test(query);
  const previous = messages
    .slice(0, lastUser ? messages.indexOf(lastUser) : 0)
    .filter((m) => m.role === "user")
    .slice(-1);
  const classificationText = followUp ? `${query} ${normalize(messageText(previous[0]))}` : query;
  const matched = RULES.filter((rule) => rule.pattern.test(classificationText));
  const explicitDomains = matched.map((rule) => rule.domain);
  const domains: TaskDomain[] = explicitDomains.length
    ? explicitDomains
    : [MODULE_DOMAIN[module] ?? "conversation"];
  const question = /[?¿]|\b(que es|como funciona|explica\w*|what is|how does|explain)\b/.test(
    query,
  );
  const action =
    /\b(crea\w*|genera\w*|guarda\w*|anade\w*|agrega\w*|envia\w*|reproduce\w*|busca\w*|borra\w*|elimina\w*|recuerda\w*|create|generate|save|add|send|play|search|delete|remember)\b/.test(
      classificationText,
    ) && !/\b(como (crear|generar|guardar|enviar)|how to)\b/.test(query);
  const requiresPlanning =
    /\b(planifica\w*|organiza\w*|plan\w*|paso a paso|lanzar|estrategia|organize|step by step)\b/.test(
      classificationText,
    ) ||
    (action && domains.length > 1);
  const needsClarification = !text || (followUp && !previous.length);
  return {
    engine: "rules-v1",
    taskType: requiresPlanning
      ? "planning"
      : action
        ? "action"
        : question
          ? "question"
          : "conversation",
    primaryGoal: text || "Aclarar la solicitud del usuario",
    domains,
    requiresPlanning,
    executionMode: needsClarification
      ? "clarify"
      : requiresPlanning
        ? "plan"
        : action
          ? "direct_action"
          : "respond",
    urgency: /\b(urgente|inmediatamente|ahora mismo|asap|urgent|immediately)\b/.test(query)
      ? "high"
      : "normal",
    requiredSkills: [...new Set(matched.flatMap((rule) => rule.skills))],
    confidence: needsClarification ? 0.25 : matched.length ? 0.85 : question ? 0.7 : 0.5,
    needsClarification,
  };
}

export function immediatePreferences(text: string): string[] {
  const query = normalize(text);
  const preferences: string[] = [];
  if (/\b(breve|corto|conciso|brief|short|concise)\b/.test(query))
    preferences.push("respuesta breve");
  if (/\b(detallad\w*|profund\w*|paso a paso|detailed|step by step)\b/.test(query))
    preferences.push("respuesta detallada");
  if (/\b(sin emojis|no emojis)\b/.test(query)) preferences.push("sin emojis");
  if (/\b(en ingles|in english)\b/.test(query)) preferences.push("idioma inglés");
  if (/\b(en espanol|in spanish)\b/.test(query)) preferences.push("idioma español");
  return preferences;
}
