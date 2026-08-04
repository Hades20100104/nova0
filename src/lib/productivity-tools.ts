import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Ctx = {
  supabase: SupabaseClient<Database>;
  userId: string;
  apiKey: string;
};

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- PROJECTS / PLANS ---------------- */
const createPlan = (ctx: Ctx) =>
  tool({
    description:
      "Crea automáticamente un plan completo: un proyecto con sus tareas (kanban + fechas). Úsalo cuando el usuario pida planificar, organizar un objetivo, lanzar algo o dividir un trabajo grande en pasos.",
    inputSchema: z.object({
      name: z.string().min(2).max(120),
      description: z.string().max(1000).nullable(),
      due_date: z.string().max(10).nullable().describe("YYYY-MM-DD o null"),
      tasks: z
        .array(
          z.object({
            title: z.string().min(2).max(200),
            notes: z.string().max(1000).nullable(),
            priority: z.number().int().min(1).max(4).describe("1 = máxima, 4 = mínima"),
            impact: z.number().int().min(1).max(5),
            effort: z.number().int().min(1).max(5),
            due_date: z.string().max(10).nullable(),
            estimate_minutes: z.number().int().min(5).max(2400).nullable(),
          }),
        )
        .min(1)
        .max(25),
    }),
    execute: async ({ name, description, due_date, tasks }) => {
      const { data: project, error } = await ctx.supabase
        .from("projects")
        .insert({
          user_id: ctx.userId,
          name,
          description: description ?? null,
          due_date: due_date || null,
          start_date: today(),
        } as never)
        .select("id, name")
        .single();
      if (error || !project) return { ok: false, error: error?.message ?? "no project" };

      const rows = tasks.map((t, i) => ({
        user_id: ctx.userId,
        project_id: (project as { id: string }).id,
        title: t.title,
        notes: t.notes ?? null,
        priority: t.priority,
        impact: t.impact,
        effort: t.effort,
        due_date: t.due_date || null,
        estimate_minutes: t.estimate_minutes ?? null,
        position: i,
      }));
      const ins = await ctx.supabase.from("tasks").insert(rows as never);
      if (ins.error) return { ok: false, error: ins.error.message };
      return {
        ok: true,
        project_id: (project as { id: string }).id,
        project: name,
        tasks: tasks.length,
        titles: tasks.map((t) => t.title),
      };
    },
  });

const addTask = (ctx: Ctx) =>
  tool({
    description: "Añade una tarea suelta al tablero del usuario.",
    inputSchema: z.object({
      title: z.string().min(2).max(200),
      notes: z.string().max(1000).nullable(),
      priority: z.number().int().min(1).max(4),
      due_date: z.string().max(10).nullable(),
      estimate_minutes: z.number().int().min(5).max(2400).nullable(),
    }),
    execute: async ({ title, notes, priority, due_date, estimate_minutes }) => {
      const { error } = await ctx.supabase.from("tasks").insert({
        user_id: ctx.userId,
        title,
        notes: notes ?? null,
        priority,
        due_date: due_date || null,
        estimate_minutes: estimate_minutes ?? null,
      } as never);
      if (error) return { ok: false, error: error.message };
      return { ok: true, title };
    },
  });

const updateTask = (ctx: Ctx) =>
  tool({
    description:
      "Actualiza el estado o la prioridad de una tarea existente (usa list_tasks antes para obtener el id).",
    inputSchema: z.object({
      task_id: z.string().uuid(),
      status: z.enum(["todo", "doing", "done"]).nullable(),
      priority: z.number().int().min(1).max(4).nullable(),
      due_date: z.string().max(10).nullable(),
    }),
    execute: async ({ task_id, status, priority, due_date }) => {
      const patch: Record<string, unknown> = {};
      if (status) {
        patch.status = status;
        patch.completed_at = status === "done" ? new Date().toISOString() : null;
      }
      if (priority) patch.priority = priority;
      if (due_date) patch.due_date = due_date;
      if (!Object.keys(patch).length) return { ok: false, error: "nada que actualizar" };
      const { error } = await ctx.supabase
        .from("tasks")
        .update(patch as never)
        .eq("id", task_id)
        .eq("user_id", ctx.userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, task_id, ...patch };
    },
  });

const listTasks = (ctx: Ctx) =>
  tool({
    description: "Lista las tareas del usuario con su id, estado, prioridad y fecha límite.",
    inputSchema: z.object({
      status: z.enum(["todo", "doing", "done", "all"]),
      limit: z.number().int().min(1).max(50),
    }),
    execute: async ({ status, limit }) => {
      let q = ctx.supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, project_id, estimate_minutes")
        .eq("user_id", ctx.userId)
        .order("priority", { ascending: true })
        .limit(limit);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, tasks: data ?? [] };
    },
  });

const prioritizeTasks = (ctx: Ctx) =>
  tool({
    description:
      "Calcula una priorización automática (impacto/esfuerzo + urgencia por fecha) y devuelve el orden sugerido para hoy.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(15) }),
    execute: async ({ limit }) => {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .select("id, title, status, priority, impact, effort, due_date")
        .eq("user_id", ctx.userId)
        .neq("status", "done")
        .limit(100);
      if (error) return { ok: false, error: error.message };
      const now = Date.now();
      const scored = (data ?? []).map((t) => {
        const r = t as {
          id: string;
          title: string;
          priority: number;
          impact: number;
          effort: number;
          due_date: string | null;
        };
        const urgency = r.due_date
          ? Math.max(0, 10 - Math.floor((new Date(r.due_date).getTime() - now) / 86400000))
          : 0;
        const score = r.impact * 3 + (5 - r.priority) * 2 + urgency - r.effort;
        return { id: r.id, title: r.title, score, due_date: r.due_date };
      });
      scored.sort((a, b) => b.score - a.score);
      return { ok: true, ranked: scored.slice(0, limit) };
    },
  });

/* ---------------- GOALS / HABITS ---------------- */
const createGoal = (ctx: Ctx) =>
  tool({
    description: "Crea un objetivo con horizonte temporal y progreso medible.",
    inputSchema: z.object({
      title: z.string().min(2).max(160),
      description: z.string().max(1000).nullable(),
      horizon: z.enum(["week", "month", "quarter", "year", "life"]),
      target_date: z.string().max(10).nullable(),
    }),
    execute: async ({ title, description, horizon, target_date }) => {
      const { error } = await ctx.supabase.from("goals").insert({
        user_id: ctx.userId,
        title,
        description: description ?? null,
        horizon,
        target_date: target_date || null,
      } as never);
      if (error) return { ok: false, error: error.message };
      return { ok: true, title, horizon };
    },
  });

const trackHabit = (ctx: Ctx) =>
  tool({
    description:
      "Crea un hábito o registra que el usuario lo cumplió hoy. Úsalo cuando hable de rutinas o de algo que quiere hacer con regularidad.",
    inputSchema: z.object({
      name: z.string().min(2).max(120),
      action: z.enum(["create", "log"]),
      target_per_week: z.number().int().min(1).max(7),
    }),
    execute: async ({ name, action, target_per_week }) => {
      const { data: existing } = await ctx.supabase
        .from("habits")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("name", name)
        .maybeSingle();
      let habitId = (existing as { id: string } | null)?.id;
      if (!habitId) {
        const { data, error } = await ctx.supabase
          .from("habits")
          .insert({ user_id: ctx.userId, name, target_per_week } as never)
          .select("id")
          .single();
        if (error || !data) return { ok: false, error: error?.message ?? "error" };
        habitId = (data as { id: string }).id;
      }
      if (action === "log") {
        await ctx.supabase
          .from("habit_logs")
          .insert({ user_id: ctx.userId, habit_id: habitId, done_on: today() } as never);
      }
      return { ok: true, name, action };
    },
  });

/* ---------------- SUMMARIES ---------------- */
const productivitySummary = (ctx: Ctx) =>
  tool({
    description:
      "Resumen diario o semanal real del usuario: tareas hechas y pendientes, objetivos, hábitos y minutos de enfoque.",
    inputSchema: z.object({ range: z.enum(["day", "week"]) }),
    execute: async ({ range }) => {
      const since = new Date(
        Date.now() - (range === "day" ? 1 : 7) * 86400000,
      ).toISOString();
      const [tasks, done, goals, habits, focus] = await Promise.all([
        ctx.supabase
          .from("tasks")
          .select("id, title, status, due_date, priority")
          .eq("user_id", ctx.userId)
          .neq("status", "done")
          .order("priority")
          .limit(20),
        ctx.supabase
          .from("tasks")
          .select("id, title")
          .eq("user_id", ctx.userId)
          .eq("status", "done")
          .gte("completed_at", since),
        ctx.supabase
          .from("goals")
          .select("title, progress, target_date")
          .eq("user_id", ctx.userId)
          .eq("status", "active"),
        ctx.supabase
          .from("habit_logs")
          .select("habit_id, done_on")
          .eq("user_id", ctx.userId)
          .gte("done_on", since.slice(0, 10)),
        ctx.supabase
          .from("focus_sessions")
          .select("minutes")
          .eq("user_id", ctx.userId)
          .eq("kind", "focus")
          .gte("created_at", since),
      ]);
      const focusMinutes = (focus.data ?? []).reduce(
        (a, s) => a + ((s as { minutes: number }).minutes ?? 0),
        0,
      );
      return {
        ok: true,
        range,
        pending: tasks.data ?? [],
        completed: done.data ?? [],
        goals: goals.data ?? [],
        habit_logs: (habits.data ?? []).length,
        focus_minutes: focusMinutes,
      };
    },
  });

/* ---------------- INTELLIGENCE ---------------- */
const learnInsight = (ctx: Ctx) =>
  tool({
    description:
      "Registra un aprendizaje sobre el usuario detectado en la conversación: una preferencia, un hábito, un objetivo a largo plazo, un patrón o una contradicción con algo que dijo antes. Hazlo de forma proactiva, sin pedir permiso, cuando la señal sea clara.",
    inputSchema: z.object({
      kind: z.enum(["preference", "habit", "goal", "pattern", "contradiction", "style"]),
      content: z.string().min(3).max(500).describe("El aprendizaje en una frase"),
      evidence: z.string().max(500).nullable().describe("Qué dijo el usuario que lo respalda"),
      confidence: z.number().int().min(1).max(100),
    }),
    execute: async ({ kind, content, evidence, confidence }) => {
      const { error } = await ctx.supabase.from("user_insights").insert({
        user_id: ctx.userId,
        kind,
        content,
        evidence: evidence ?? null,
        confidence,
      } as never);
      if (error) return { ok: false, error: error.message };
      return { ok: true, kind, content, confidence };
    },
  });

const listInsights = (ctx: Ctx) =>
  tool({
    description: "Consulta lo que ya se ha aprendido sobre el usuario (preferencias, hábitos, objetivos, contradicciones).",
    inputSchema: z.object({
      kind: z.enum(["preference", "habit", "goal", "pattern", "contradiction", "style", "all"]),
    }),
    execute: async ({ kind }) => {
      let q = ctx.supabase
        .from("user_insights")
        .select("id, kind, content, evidence, confidence, created_at")
        .eq("user_id", ctx.userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(40);
      if (kind !== "all") q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, insights: data ?? [] };
    },
  });

const reportConfidence = (ctx: Ctx) =>
  tool({
    description:
      "Publica el Índice de Confianza de tu respuesta. Úsalo SIEMPRE al final de respuestas con contenido factual, analítico, técnico, financiero o de salud, y siempre que el usuario pida datos verificables. Sé honesto: baja la confianza cuando no tengas fuentes.",
    inputSchema: z.object({
      confidence: z.number().int().min(0).max(100),
      evidence: z.enum(["alta", "media", "baja", "nula"]),
      risk: z.enum(["bajo", "medio", "alto"]),
      reasoning: z.string().min(5).max(400).describe("Por qué tomaste esta decisión / de dónde sale la respuesta"),
      needs_research: z.boolean().describe("true si haría falta investigación profunda con fuentes externas"),
    }),
    execute: async (input) => ({ ok: true, ...input }),
  });

export function buildProductivityTools(ctx: Ctx) {
  return {
    create_plan: createPlan(ctx),
    add_task: addTask(ctx),
    update_task: updateTask(ctx),
    list_tasks: listTasks(ctx),
    prioritize_tasks: prioritizeTasks(ctx),
    create_goal: createGoal(ctx),
    track_habit: trackHabit(ctx),
    productivity_summary: productivitySummary(ctx),
    learn_insight: learnInsight(ctx),
    list_insights: listInsights(ctx),
    report_confidence: reportConfidence(ctx),
  };
}
