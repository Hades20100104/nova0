import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { generateText } from "ai";
import { z } from "zod";

const ThemeSchema = z.object({
  label: z.string().min(1).max(40),
  primary: z.string().min(3).max(60),
  accent: z.string().min(3).max(60),
  glow: z.string().min(3).max(60),
  aura: z.string().min(3).max(60),
});

const WidgetSchema = z.object({
  title: z.string().min(1).max(40),
  kind: z.enum(["note", "clock", "counter", "progress", "quote", "prompt"]),
  text: z.string().max(280).optional(),
  value: z.number().optional(),
  target: z.number().optional(),
  source: z.enum(["images", "documents", "memory", "threads", "tasks"]).optional(),
  seed: z.string().max(200).optional(),
  accent: z.string().max(60).optional(),
});

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced?.[1] ?? raw).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 ? text.slice(start, end + 1) : text);
}

async function ask(prompt: string, system: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system,
    prompt,
  });
  return text;
}

export const generateAppearance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; assistant?: "nova" | "nevira" | "both" }) =>
    z
      .object({
        prompt: z.string().min(2).max(300),
        assistant: z.enum(["nova", "nevira", "both"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const target =
      data.assistant === "nevira"
        ? "Se aplicará a NEVIRA (HUD técnico, cian/azul por defecto)."
        : data.assistant === "nova"
          ? "Se aplicará a NOVA (interfaz cósmica, violeta/magenta por defecto)."
          : "Se aplicará a ambos asistentes.";
    const raw = await ask(
      `Crea una paleta para esta descripción: "${data.prompt}". ${target}`,
      `Eres un diseñador de sistemas de color. Devuelve SOLO JSON con esta forma:
{"label":"nombre corto","primary":"oklch(L C H)","accent":"oklch(L C H)","glow":"oklch(L C H)","aura":"oklch(L C H)"}
Reglas: usa exclusivamente formato oklch() con lightness entre 0.6 y 0.85 para primary/accent (la app tiene fondo oscuro), croma 0.03–0.28. Sin texto extra.`,
    );
    const theme = ThemeSchema.parse(extractJson(raw));
    return { theme: { ...theme, id: `ai-${Date.now().toString(36)}` } };
  });

export const generateWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string }) => z.object({ prompt: z.string().min(2).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const raw = await ask(
      `Crea un widget para: "${data.prompt}"`,
      `Diseñas widgets de un dashboard HUD. Devuelve SOLO JSON:
{"title":"...","kind":"note|clock|counter|progress|quote|prompt","text":"opcional","value":0,"target":100,"source":"images|documents|memory|threads|tasks","seed":"prompt sugerido para el chat","accent":"oklch(L C H)"}
- kind "counter" requiere "source" (dato real de la app).
- kind "progress" requiere value y target.
- kind "prompt" requiere "seed".
Sin texto extra.`,
    );
    const widget = WidgetSchema.parse(extractJson(raw));
    return { widget: { ...widget, id: `w-${Date.now().toString(36)}` } };
  });

export const describeUserMirror = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { summary: string }) => z.object({ summary: z.string().min(2).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const text = await ask(
      `Datos de uso del usuario:\n${data.summary}\n\nDescribe quién crees que es y cómo trabaja.`,
      `Eres un perfilador con humor afilado pero amable. A partir de métricas de uso de una app de asistentes IA, escribe un retrato del usuario en 4-6 frases: cómo trabaja, qué le obsesiona, sus manías y un consejo final. Nada de datos sensibles ni juicios crueles. Español. Sin listas.`,
    );
    return { text: text.trim() };
  });
