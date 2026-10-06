import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Automation } from "./automations.functions";

type SB = SupabaseClient<Database>;

/** Minutes since midnight in the given IANA timezone (defaults to UTC). */
function localParts(now: Date, tz?: string) {
  let zone = tz || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) * 60 + Number(g("minute")), zone };
}

export function isDueServer(a: Automation, now: Date): boolean {
  const t = a.trigger_config as { type?: string; at?: string; minutes?: number; tz?: string };
  const last = a.last_triggered_at ? new Date(a.last_triggered_at) : null;
  if (t?.type === "interval" && t.minutes) {
    return !last || now.getTime() - last.getTime() >= t.minutes * 60_000;
  }
  if (t?.type === "time" && t.at) {
    const [h, m] = t.at.split(":").map(Number);
    const cur = localParts(now, t.tz);
    if (cur.minutes < h * 60 + m) return false;
    if (!last) return true;
    // Already ran today (in the automation's timezone)?
    return localParts(last, cur.zone).day !== cur.day;
  }
  return false;
}

export async function executeSteps(supabase: SB, userId: string, automation: Automation) {
  const steps = automation.action_config?.steps ?? [];
  const { generateText, stepCountIs } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway");
  const { buildChatTools } = await import("./chat-tools");
  const { getSectionAgent } = await import("./section-agents");

  const apiKey = process.env["LOVABLE_API_KEY"];
  const log: string[] = [];
  const notifications: string[] = [];
  const speech: string[] = [];
  let navigate: string | null = null;
  let failed = false;

  for (const step of steps) {
    try {
      if (step.type === "notify") {
        notifications.push(step.message);
        log.push(`Notificación: ${step.message}`);
      } else if (step.type === "speak") {
        speech.push(step.text);
        log.push(`Voz: ${step.text}`);
      } else if (step.type === "open_section") {
        navigate = step.slug;
        log.push(`Abrir sección: ${step.slug}`);
      } else if (step.type === "task") {
        const { error } = await supabase
          .from("tasks")
          .insert({ user_id: userId, title: step.title, status: "todo" } as never);
        if (error) failed = true;
        log.push(error ? `Tarea falló: ${error.message}` : `Tarea creada: ${step.title}`);
      } else if (step.type === "ai") {
        if (!apiKey) {
          log.push("IA no disponible (falta clave).");
          continue;
        }
        const gateway = createLovableAiGatewayProvider(apiKey);
        const agent = getSectionAgent("nevira", step.module ?? "automatizaciones");
        const tools = buildChatTools({ supabase, userId, apiKey }, agent?.allowedTools);
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system:
            "Ejecutas un paso de una automatización sin supervisión humana. Usa las herramientas necesarias y responde con un resumen de una o dos frases de lo que hiciste.",
          prompt: step.prompt,
          tools,
          stopWhen: stepCountIs(8),
        });
        log.push(text.slice(0, 400));
        notifications.push(text.slice(0, 200));
      }
    } catch (e) {
      failed = true;
      log.push(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    }
  }
  return { log, notifications, speech, navigate, failed };
}
