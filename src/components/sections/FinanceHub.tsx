import { useMemo, useRef, useState } from "react";
import {
  useFinanceCategories,
  useFinanceTransactions,
  useFinanceGoals,
  useFinanceMutations,
  monthlySeries,
  categoryBreakdown,
  forecast,
  parseFinanceCSV,
  monthKey,
} from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Upload, TrendingUp, TrendingDown, Target, Wallet, PieChart, Sparkles } from "lucide-react";

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-primary/25 bg-card/40 p-4 ${className}`}>{children}</div>;
}

function Kpi({ label, value, delta, icon: Icon }: { label: string; value: string; delta?: string; icon: typeof Wallet }) {
  return (
    <Card className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
        <div className="text-lg font-display tracking-wide truncate">{value}</div>
        {delta && <div className="text-[11px] text-primary">{delta}</div>}
      </div>
    </Card>
  );
}

export function FinanceHub() {
  const { data: cats = [] } = useFinanceCategories();
  const { data: tx = [], isLoading } = useFinanceTransactions();
  const { data: goals = [] } = useFinanceGoals();
  const m = useFinanceMutations();
  const fileRef = useRef<HTMLInputElement>(null);

  const thisMonth = monthKey(new Date());
  const series = useMemo(() => monthlySeries(tx, 6), [tx]);
  const breakdown = useMemo(() => categoryBreakdown(tx, cats, thisMonth), [tx, cats, thisMonth]);
  const next = useMemo(() => forecast(series), [series]);

  const cur = series[series.length - 1] ?? { income: 0, expense: 0, net: 0 };
  const prev = series[series.length - 2] ?? { income: 0, expense: 0, net: 0 };
  const balance = tx.reduce((s, t) => s + (t.kind === "income" ? Number(t.amount) : -Number(t.amount)), 0);
  const savingsRate = cur.income > 0 ? Math.round(((cur.income - cur.expense) / cur.income) * 100) : 0;
  const maxBar = Math.max(...series.flatMap((s) => [s.income, s.expense]), 1);

  const [form, setForm] = useState({ amount: "", kind: "expense" as "income" | "expense", description: "", category_id: "", occurred_on: new Date().toISOString().slice(0, 10) });
  const [catForm, setCatForm] = useState({ name: "", kind: "expense" as "income" | "expense", monthly_budget: "" });
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", target_date: "" });

  const insights = useMemo(() => {
    const out: string[] = [];
    if (cur.expense > prev.expense && prev.expense > 0)
      out.push(`Tus gastos subieron ${Math.round(((cur.expense - prev.expense) / prev.expense) * 100)}% frente al mes pasado.`);
    if (savingsRate >= 20) out.push(`Vas guardando el ${savingsRate}% de lo que entra: ritmo saludable.`);
    else if (cur.income > 0) out.push(`Estás guardando solo el ${savingsRate}%. Una meta cómoda son 20%.`);
    const over = breakdown.filter((b) => b.budget && b.amount > b.budget);
    if (over.length) out.push(`Te pasaste del presupuesto en: ${over.map((o) => o.name).join(", ")}.`);
    if (breakdown[0]) out.push(`Tu mayor gasto es ${breakdown[0].name} (${breakdown[0].pct}% del mes).`);
    out.push(`Previsión del próximo mes: ${money(next.income)} de ingresos y ${money(next.expense)} de gastos.`);
    return out;
  }, [cur, prev, savingsRate, breakdown, next]);

  const addTx = async () => {
    const amount = Number(form.amount);
    if (!amount || !form.description.trim()) return toast.error("Falta importe o descripción");
    await m.addTransaction.mutateAsync({
      amount: Math.abs(amount),
      kind: form.kind,
      description: form.description.trim(),
      occurred_on: form.occurred_on,
      category_id: form.category_id || null,
    });
    setForm({ ...form, amount: "", description: "" });
    toast.success("Movimiento registrado");
  };

  const importCSV = async (file: File) => {
    const rows = parseFinanceCSV(await file.text());
    if (!rows.length) return toast.error("No se pudieron leer movimientos del CSV");
    await m.importTransactions.mutateAsync(rows);
    toast.success(`${rows.length} movimientos importados`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Balance total" value={money(balance)} icon={Wallet} />
        <Kpi label="Ingresos del mes" value={money(cur.income)} icon={TrendingUp} />
        <Kpi label="Gastos del mes" value={money(cur.expense)} icon={TrendingDown} />
        <Kpi label="Tasa de ahorro" value={`${savingsRate}%`} delta={`Previsión: ${money(next.net)}`} icon={Target} />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4 pt-4">
          <Card>
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-3">Tendencia · 6 meses</div>
            <div className="flex items-end gap-3 h-40">
              {series.map((s) => (
                <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1 h-32 w-full justify-center">
                    <div className="w-3 rounded-t bg-primary/70" style={{ height: `${(s.income / maxBar) * 100}%` }} title={`Ingresos ${money(s.income)}`} />
                    <div className="w-3 rounded-t bg-destructive/60" style={{ height: `${(s.expense / maxBar) * 100}%` }} title={`Gastos ${money(s.expense)}`} />
                  </div>
                  <div className="text-[9px] text-muted-foreground">{s.month.slice(5)}</div>
                </div>
              ))}
              <div className="flex-1 flex flex-col items-center gap-1 opacity-60">
                <div className="flex items-end gap-1 h-32 w-full justify-center">
                  <div className="w-3 rounded-t border border-primary/70 border-dashed" style={{ height: `${(next.income / maxBar) * 100}%` }} />
                  <div className="w-3 rounded-t border border-destructive/60 border-dashed" style={{ height: `${(next.expense / maxBar) * 100}%` }} />
                </div>
                <div className="text-[9px] text-muted-foreground">prev.</div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-3 flex items-center gap-2">
                <PieChart className="h-3.5 w-3.5" /> Gasto por categoría
              </div>
              {breakdown.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay gastos este mes.</p>}
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs">
                      <span>{b.name}</span>
                      <span className={b.budget && b.amount > b.budget ? "text-destructive" : "text-muted-foreground"}>
                        {money(b.amount)}{b.budget ? ` / ${money(b.budget)}` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Análisis
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {insights.map((i, k) => <li key={k} className="flex gap-2"><span className="text-primary">▸</span>{i}</li>)}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movimientos" className="space-y-3 pt-4">
          <Card className="grid gap-2 sm:grid-cols-6 items-end">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "income" | "expense" })}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <Input placeholder="Importe" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {cats.filter((c) => c.kind === form.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
              <Button size="sm" onClick={addTx}><Plus className="h-4 w-4" /></Button>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Importar CSV</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCSV(f); e.target.value = ""; }} />
          </div>

          <Card>
            {isLoading && <div className="text-xs text-muted-foreground">Cargando movimientos…</div>}
            {!isLoading && tx.length === 0 && <p className="text-xs text-muted-foreground">Sin movimientos todavía. Añade uno o importa tu CSV del banco.</p>}
            <div className="divide-y divide-primary/10">
              {tx.slice(0, 60).map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`w-1.5 h-6 rounded-full ${t.kind === "income" ? "bg-primary" : "bg-destructive/70"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{t.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.occurred_on} · {cats.find((c) => c.id === t.category_id)?.name ?? "Sin categoría"}
                      {t.source !== "manual" && ` · ${t.source}`}
                    </div>
                  </div>
                  <div className={t.kind === "income" ? "text-primary" : ""}>
                    {t.kind === "income" ? "+" : "−"}{money(Number(t.amount))}
                  </div>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => m.deleteTransaction.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-3 pt-4">
          <Card className="grid gap-2 sm:grid-cols-4 items-end">
            <Input placeholder="Nombre" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={catForm.kind} onChange={(e) => setCatForm({ ...catForm, kind: e.target.value as "income" | "expense" })}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <Input placeholder="Presupuesto mensual" type="number" value={catForm.monthly_budget}
              onChange={(e) => setCatForm({ ...catForm, monthly_budget: e.target.value })} />
            <Button size="sm" onClick={async () => {
              if (!catForm.name.trim()) return toast.error("Ponle nombre a la categoría");
              await m.addCategory.mutateAsync({
                name: catForm.name.trim(),
                kind: catForm.kind,
                monthly_budget: catForm.monthly_budget ? Number(catForm.monthly_budget) : null,
              });
              setCatForm({ name: "", kind: "expense", monthly_budget: "" });
            }}><Plus className="h-4 w-4 mr-1" />Añadir</Button>
          </Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {cats.map((c) => (
              <Card key={c.id} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                <div className="flex-1">
                  <div className="text-sm">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.kind === "income" ? "Ingreso" : "Gasto"}</div>
                </div>
                <Input className="w-32" type="number" defaultValue={c.monthly_budget ?? ""} placeholder="Presupuesto"
                  onBlur={(e) => m.updateCategory.mutate({ id: c.id, monthly_budget: e.target.value ? Number(e.target.value) : null })} />
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metas" className="space-y-3 pt-4">
          <Card className="grid gap-2 sm:grid-cols-4 items-end">
            <Input placeholder="Meta (ej. Fondo de emergencia)" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
            <Input placeholder="Objetivo" type="number" value={goalForm.target_amount} onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} />
            <Input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
            <Button size="sm" onClick={async () => {
              if (!goalForm.name.trim() || !Number(goalForm.target_amount)) return toast.error("Falta nombre u objetivo");
              await m.addGoal.mutateAsync({
                name: goalForm.name.trim(),
                target_amount: Number(goalForm.target_amount),
                target_date: goalForm.target_date || null,
              });
              setGoalForm({ name: "", target_amount: "", target_date: "" });
            }}><Plus className="h-4 w-4 mr-1" />Crear</Button>
          </Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {goals.length === 0 && <p className="text-xs text-muted-foreground">Aún no tienes metas de ahorro.</p>}
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount || 1)) * 100));
              return (
                <Card key={g.id}>
                  <div className="flex justify-between text-sm"><span>{g.name}</span><span>{pct}%</span></div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden my-2">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{money(Number(g.current_amount))} de {money(Number(g.target_amount))}</span>
                    {g.target_date && <span>· para {g.target_date}</span>}
                    <div className="flex-1" />
                    <Input className="w-24 h-7" type="number" placeholder="+ abono"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const v = Number((e.target as HTMLInputElement).value);
                        if (!v) return;
                        m.updateGoal.mutate({ id: g.id, current_amount: Number(g.current_amount) + v });
                        (e.target as HTMLInputElement).value = "";
                      }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
