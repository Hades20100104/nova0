import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

export function buildCalendarFinanceTools(ctx: Ctx) {
  const sb = ctx.supabase as unknown as SupabaseClient;
  return {
    create_event: tool({
      description:
        "Crea un evento real en el calendario del usuario. Usa fechas ISO 8601 con zona horaria. Detecta y reporta conflictos.",
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        starts_at: z.string().describe("Inicio ISO 8601"),
        ends_at: z.string().describe("Fin ISO 8601"),
        description: z.string().max(2000).optional(),
        location: z.string().max(300).optional(),
        recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
        reminder_minutes: z.number().int().min(0).max(10080).optional(),
        task_id: z.string().optional(),
      }),
      execute: async (e) => {
        const { data: clash } = await sb
          .from("calendar_events")
          .select("title, starts_at, ends_at")
          .lt("starts_at", e.ends_at)
          .gt("ends_at", e.starts_at)
          .limit(3);
        const { data, error } = await sb
          .from("calendar_events")
          .insert({ ...e, recurrence: e.recurrence ?? "none", user_id: ctx.userId, source: "ai" })
          .select("id, title, starts_at")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, event: data, conflicts: clash ?? [] };
      },
    }),
    list_events: tool({
      description: "Lista los eventos del calendario en un rango de fechas.",
      inputSchema: z.object({ from: z.string(), to: z.string() }),
      execute: async ({ from, to }) => {
        const { data, error } = await sb
          .from("calendar_events")
          .select("id, title, starts_at, ends_at, recurrence, location")
          .gte("ends_at", from)
          .lte("starts_at", to)
          .order("starts_at")
          .limit(50);
        if (error) return { ok: false, error: error.message };
        return { ok: true, events: data };
      },
    }),
    delete_event: tool({
      description: "Elimina un evento del calendario por id.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { error } = await sb.from("calendar_events").delete().eq("id", id);
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    add_transaction: tool({
      description: "Registra un ingreso o gasto real del usuario. Si se indica categoría por nombre, se crea si no existe.",
      inputSchema: z.object({
        amount: z.number().positive(),
        kind: z.enum(["income", "expense"]),
        description: z.string().min(1).max(300),
        occurred_on: z.string().optional().describe("YYYY-MM-DD, por defecto hoy"),
        category: z.string().max(60).optional(),
      }),
      execute: async ({ category, occurred_on, ...t }) => {
        let category_id: string | null = null;
        if (category) {
          const { data: found } = await sb.from("finance_categories").select("id").ilike("name", category).limit(1);
          if (found?.[0]) category_id = found[0].id;
          else {
            const { data: c } = await sb
              .from("finance_categories")
              .insert({ name: category, kind: t.kind, color: "oklch(0.78 0.18 130)", user_id: ctx.userId })
              .select("id")
              .single();
            category_id = c?.id ?? null;
          }
        }
        const { error } = await sb.from("finance_transactions").insert({
          ...t,
          category_id,
          occurred_on: occurred_on ?? new Date().toISOString().slice(0, 10),
          user_id: ctx.userId,
          source: "ai",
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    finance_summary: tool({
      description: "Resume las finanzas reales del usuario: ingresos, gastos y top categorías de los últimos meses. Úsalo para análisis.",
      inputSchema: z.object({ months: z.number().int().min(1).max(12).optional() }),
      execute: async ({ months = 3 }) => {
        const since = new Date();
        since.setMonth(since.getMonth() - months);
        const [{ data: tx }, { data: cats }, { data: goals }] = await Promise.all([
          sb.from("finance_transactions").select("amount, kind, category_id, occurred_on").gte("occurred_on", since.toISOString().slice(0, 10)),
          sb.from("finance_categories").select("id, name, monthly_budget"),
          sb.from("finance_goals").select("name, target_amount, current_amount, target_date"),
        ]);
        const byMonth: Record<string, { income: number; expense: number }> = {};
        const byCat: Record<string, number> = {};
        for (const r of tx ?? []) {
          const m = String(r.occurred_on).slice(0, 7);
          byMonth[m] ??= { income: 0, expense: 0 };
          byMonth[m][r.kind as "income" | "expense"] += Number(r.amount);
          if (r.kind === "expense") {
            const n = cats?.find((c) => c.id === r.category_id)?.name ?? "Sin categoría";
            byCat[n] = (byCat[n] ?? 0) + Number(r.amount);
          }
        }
        return { ok: true, byMonth, topCategories: Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6), categories: cats, goals };
      },
    }),
  };
}
