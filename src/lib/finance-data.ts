import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FinanceCategory = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string | null;
  monthly_budget: number | null;
};

export type FinanceTransaction = {
  id: string;
  amount: number;
  kind: "income" | "expense";
  category_id: string | null;
  description: string;
  occurred_on: string;
  method: string | null;
  recurring: boolean;
  source: string;
};

export type FinanceGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
};

const k = (n: string, uid?: string) => [n, uid ?? "anon"];

export function useFinanceCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: k("finance_categories", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<FinanceCategory[]> => {
      const { data, error } = await supabase.from("finance_categories").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as FinanceCategory[];
    },
  });
}

export function useFinanceTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: k("finance_transactions", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<FinanceTransaction[]> => {
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as FinanceTransaction[];
    },
  });
}

export function useFinanceGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: k("finance_goals", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<FinanceGoal[]> => {
      const { data, error } = await supabase.from("finance_goals").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as FinanceGoal[];
    },
  });
}

export function useFinanceMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: k("finance_transactions", user?.id) });
    qc.invalidateQueries({ queryKey: k("finance_categories", user?.id) });
    qc.invalidateQueries({ queryKey: k("finance_goals", user?.id) });
  };

  const addTransaction = useMutation({
    mutationFn: async (t: Partial<FinanceTransaction> & { amount: number; kind: "income" | "expense"; description: string; occurred_on: string }) => {
      const { error } = await supabase.from("finance_transactions").insert({ ...t, user_id: user!.id } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const importTransactions = useMutation({
    mutationFn: async (rows: Array<Partial<FinanceTransaction>>) => {
      if (!rows.length) return 0;
      const { error } = await supabase
        .from("finance_transactions")
        .insert(rows.map((r) => ({ ...r, user_id: user!.id, source: "csv" })) as never);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addCategory = useMutation({
    mutationFn: async (c: { name: string; kind: "income" | "expense"; color?: string; monthly_budget?: number | null }) => {
      const { error } = await supabase
        .from("finance_categories")
        .insert({ color: "oklch(0.78 0.18 130)", ...c, user_id: user!.id } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinanceCategory> & { id: string }) => {
      const { error } = await supabase.from("finance_categories").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addGoal = useMutation({
    mutationFn: async (g: { name: string; target_amount: number; target_date?: string | null }) => {
      const { error } = await supabase.from("finance_goals").insert({ ...g, user_id: user!.id } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinanceGoal> & { id: string }) => {
      const { error } = await supabase.from("finance_goals").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addTransaction, importTransactions, deleteTransaction, addCategory, updateCategory, addGoal, updateGoal };
}

/* ---------------- analytics ---------------- */
export const monthKey = (d: string | Date) =>
  (typeof d === "string" ? d : d.toISOString().slice(0, 10)).slice(0, 7);

export function monthlySeries(tx: FinanceTransaction[], months = 6) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys.map((mk) => {
    const rows = tx.filter((t) => monthKey(t.occurred_on) === mk);
    const income = rows.filter((r) => r.kind === "income").reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter((r) => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);
    return { month: mk, income, expense, net: income - expense };
  });
}

export function categoryBreakdown(tx: FinanceTransaction[], cats: FinanceCategory[], mk: string) {
  const rows = tx.filter((t) => t.kind === "expense" && monthKey(t.occurred_on) === mk);
  const total = rows.reduce((s, r) => s + Number(r.amount), 0) || 1;
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.category_id ?? "none", (map.get(r.category_id ?? "none") ?? 0) + Number(r.amount));
  return [...map.entries()]
    .map(([id, amount]) => {
      const cat = cats.find((c) => c.id === id);
      return {
        id,
        name: cat?.name ?? "Sin categoría",
        color: cat?.color ?? "oklch(0.7 0.05 260)",
        budget: cat?.monthly_budget ?? null,
        amount,
        pct: Math.round((amount / total) * 100),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/** Linear-regression forecast of next month's expense/income. */
export function forecast(series: Array<{ income: number; expense: number }>) {
  const project = (vals: number[]) => {
    const n = vals.length;
    if (n < 2) return vals[0] ?? 0;
    const mx = (n - 1) / 2;
    const my = vals.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    vals.forEach((v, i) => {
      num += (i - mx) * (v - my);
      den += (i - mx) ** 2;
    });
    const slope = den ? num / den : 0;
    return Math.max(0, my + slope * (n - mx));
  };
  const income = project(series.map((s) => s.income));
  const expense = project(series.map((s) => s.expense));
  return { income, expense, net: income - expense };
}

/* ---------------- CSV ---------------- */
export function parseFinanceCSV(text: string): Array<Partial<FinanceTransaction>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) > (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = lines[0]!.split(sep).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx(["fecha", "date"]);
  const iDesc = idx(["desc", "concepto", "detalle"]);
  const iAmount = idx(["importe", "amount", "monto", "cantidad"]);
  const iKind = idx(["tipo", "kind"]);
  const out: Array<Partial<FinanceTransaction>> = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const raw = cells[iAmount >= 0 ? iAmount : 2] ?? "";
    const num = Number(raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (!isFinite(num) || num === 0) continue;
    const dateCell = cells[iDate >= 0 ? iDate : 0] ?? "";
    const d = new Date(dateCell.includes("/") ? dateCell.split("/").reverse().join("-") : dateCell);
    const kindCell = (cells[iKind] ?? "").toLowerCase();
    const kind: "income" | "expense" = kindCell.startsWith("ing") || kindCell === "income" ? "income" : num > 0 && iKind < 0 ? "income" : "expense";
    out.push({
      amount: Math.abs(num),
      kind: iKind >= 0 ? kind : num > 0 ? "income" : "expense",
      description: cells[iDesc >= 0 ? iDesc : 1] ?? "Movimiento importado",
      occurred_on: isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10),
    });
  }
  return out;
}
