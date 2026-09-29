import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

/**
 * Builds the "contextual intelligence" block injected in every chat request:
 * memoria explícita, aprendizajes inferidos, objetivos activos, tareas críticas
 * y temas recientes. Esto es lo que permite a NOVA/NEVIRA no pedir que el
 * usuario repita sus preferencias.
 */
export async function buildUserContext(supabase: SB, userId: string): Promise<string> {
  const [memory, insights, goals, tasks, threads, habits] = await Promise.all([
    supabase
      .from("user_memory")
      .select("key, value, category, confidence")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("user_insights")
      .select("kind, content, confidence, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("goals")
      .select("title, horizon, progress, target_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(10),
    supabase
      .from("tasks")
      .select("title, status, priority, due_date")
      .eq("user_id", userId)
      .neq("status", "done")
      .order("priority", { ascending: true })
      .limit(10),
    supabase
      .from("assistant_threads")
      .select("title, module, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("habits")
      .select("name, target_per_week")
      .eq("user_id", userId)
      .eq("archived", false)
      .limit(10),
  ]);

  const lines: string[] = [];
  const push = (label: string, items: string[]) => {
    if (items.length) lines.push(`${label}:\n- ${items.join("\n- ")}`);
  };

  push(
    "MEMORIA EXPLÍCITA (hechos que el usuario ya te dijo — NO se los vuelvas a preguntar)",
    (memory.data ?? []).map(
      (m) => `${(m as { key: string }).key}: ${(m as { value: string }).value}`,
    ),
  );
  push(
    "APRENDIZAJES INFERIDOS (preferencias, hábitos, patrones y contradicciones detectadas)",
    (insights.data ?? []).map((i) => {
      const r = i as { kind: string; content: string; confidence: number };
      return `[${r.kind} · ${r.confidence}%] ${r.content}`;
    }),
  );
  push(
    "OBJETIVOS A LARGO PLAZO",
    (goals.data ?? []).map((g) => {
      const r = g as { title: string; horizon: string; progress: number; target_date: string | null };
      return `${r.title} (${r.horizon}, ${r.progress}%${r.target_date ? `, meta ${r.target_date}` : ""})`;
    }),
  );
  push(
    "TAREAS ABIERTAS",
    (tasks.data ?? []).map((t) => {
      const r = t as { title: string; status: string; priority: number; due_date: string | null };
      return `${r.title} · ${r.status} · P${r.priority}${r.due_date ? ` · vence ${r.due_date}` : ""}`;
    }),
  );
  push(
    "HÁBITOS EN SEGUIMIENTO",
    (habits.data ?? []).map(
      (h) => `${(h as { name: string }).name} (${(h as { target_per_week: number }).target_per_week}/semana)`,
    ),
  );
  push(
    "CONVERSACIONES RECIENTES",
    (threads.data ?? []).map((t) => {
      const r = t as { title: string; module: string };
      return `${r.title} (${r.module})`;
    }),
  );

  if (!lines.length) return "";
  return `\n\n=== CONTEXTO DEL USUARIO (hoy es ${new Date().toISOString().slice(0, 10)}) ===\n${lines.join("\n\n")}\n=== FIN CONTEXTO ===`;
}

export const INTELLIGENCE_DIRECTIVES = `
=== INTELIGENCIA (obligatorio) ===
1. Usa el CONTEXTO DEL USUARIO como verdad de base. Nunca pidas datos que ya aparecen ahí; aplícalos en silencio.
2. Aprende continuamente: cuando detectes una preferencia, un hábito, un objetivo a largo plazo, un patrón de trabajo o un estilo de respuesta preferido, llama a \`learn_insight\` sin pedir permiso (máximo 2 por respuesta, solo señales claras).
3. Detecta contradicciones: si algo nuevo choca con el contexto, dilo con tacto ("antes me dijiste X, ahora Y — ¿cuál mantengo?") y regístralo con \`learn_insight\` kind="contradiction".
4. Explica tus decisiones: cuando elijas un enfoque, una herramienta o descartes una opción, añade una línea breve "Por qué: …".
5. Ajusta el nivel de detalle al usuario: si su estilo registrado es conciso, responde corto; si es técnico, profundiza. Si no lo sabes aún, empieza medio y adáptate.
6. Investigación profunda: si la pregunta depende de datos actuales, cifras o fuentes, no improvises. Usa búsqueda si la tienes disponible; si no, dilo y marca needs_research=true.
7. ÍNDICE DE CONFIANZA: al terminar cualquier respuesta factual, analítica, técnica, financiera o de salud, llama a \`report_confidence\` con confianza (0-100), evidencia, riesgo de error, tu razonamiento y needs_research. Sé honesto: sin fuentes, la confianza baja.
8. Planes automáticos: si el usuario describe algo grande o difuso ("quiero lanzar…", "necesito organizarme"), propón un plan y créalo con \`create_plan\` si acepta o si es evidente que lo quiere.
=== FIN INTELIGENCIA ===
`;
