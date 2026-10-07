import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ---------------- Schemas ---------------- */

export const StepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ai"), prompt: z.string().min(2).max(1200), module: z.string().max(40).optional() }),
  z.object({ type: z.literal("notify"), message: z.string().min(1).max(300) }),
  z.object({ type: z.literal("speak"), text: z.string().min(1).max(300) }),
  z.object({ type: z.literal("task"), title: z.string().min(1).max(160) }),
  z.object({ type: z.literal("open_section"), slug: z.string().min(1).max(40) }),
]);
export type Step = z.infer<typeof StepSchema>;

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("time"), at: z.string().regex(/^\d{2}:\d{2}$/) }),
  z.object({ type: z.literal("interval"), minutes: z.number().int().min(5).max(1440) }),
  z.object({ type: z.literal("voice"), phrase: z.string().min(2).max(60) }),
  z.object({ type: z.literal("app_open") }),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  trigger_config: Trigger;
  action_type: string;
  action_config: { steps: Step[] };
  last_triggered_at: string | null;
  last_state: string | null;
};

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  enabled: z.boolean().default(true),
  trigger: TriggerSchema,
  steps: z.array(StepSchema).min(1).max(8),
});

/* ---------------- CRUD ---------------- */

export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("automations")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { automations: (data ?? []) as unknown as Automation[] };
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const row = {
      user_id: context.userId,
      name: data.name,
      enabled: data.enabled,
      trigger_type: data.trigger.type,
      trigger_config: data.trigger as unknown as Record<string, unknown>,
      action_type: "chain",
      action_config: { steps: data.steps } as unknown as Record<string, unknown>,
    };
    const q = data.id
      ? context.supabase.from("automations").update(row as never).eq("id", data.id).eq("user_id", context.userId).select().single()
      : context.supabase.from("automations").insert(row as never).select().single();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message);
    return { automation: saved as unknown as Automation };
  });

export const setAutomationEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; enabled: boolean }) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("automations")
      .update({ enabled: data.enabled } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("automations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Execution engine ---------------- */

export const runAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("automations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Automatización no encontrada");
    const automation = row as unknown as Automation;
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
          const { error: tErr } = await context.supabase
            .from("tasks")
            .insert({ user_id: context.userId, title: step.title, status: "todo" } as never);
          log.push(tErr ? `Tarea falló: ${tErr.message}` : `Tarea creada: ${step.title}`);
        } else if (step.type === "ai") {
          if (!apiKey) {
            log.push("IA no disponible (falta clave).");
            continue;
          }
          const gateway = createLovableAiGatewayProvider(apiKey);
          const agent = getSectionAgent("nevira", step.module ?? "automatizaciones");
          const tools = buildChatTools(
            { supabase: context.supabase, userId: context.userId, apiKey },
            agent?.allowedTools,
          );
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
        log.push(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
      }
    }

    const state = log.join(" · ").slice(0, 900);
    await context.supabase
      .from("automations")
      .update({ last_triggered_at: new Date().toISOString(), last_state: state } as never)
      .eq("id", automation.id);

    return { ok: true, log, notifications, speech, navigate, name: automation.name };
  });
