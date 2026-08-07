import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const USAGE_KEY = "nv-usage-minutes-v1";

/** Local, privacy-safe usage clock: counts minutes with the app open. */
export function useUsageMinutes() {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => Number(localStorage.getItem(USAGE_KEY) ?? 0);
    setMinutes(read());
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const next = read() + 1;
      localStorage.setItem(USAGE_KEY, String(next));
      setMinutes(next);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return minutes;
}

export type DeepStats = Awaited<ReturnType<typeof loadDeepStats>>;

async function loadDeepStats() {
  const since = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

  const [tasks, goals, autos, sessions, insights, memory, threads, images, docs] = await Promise.all([
    supabase.from("tasks").select("status, completed_at, estimate_minutes"),
    supabase.from("goals").select("status, progress"),
    supabase.from("automations").select("enabled, last_triggered_at"),
    supabase.from("focus_sessions").select("minutes, created_at").gte("created_at", since(90)),
    supabase.from("user_insights").select("confidence, status"),
    supabase.from("user_memory").select("category, hits"),
    supabase.from("assistant_threads").select("title, module, updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("generated_images").select("id", { count: "exact", head: true }),
    supabase.from("generated_documents").select("id", { count: "exact", head: true }),
  ]);

  const taskRows = tasks.data ?? [];
  const tasksDone = taskRows.filter((t) => t.status === "done").length;
  const tasksOpen = taskRows.length - tasksDone;

  const goalRows = goals.data ?? [];
  const goalsDone = goalRows.filter((g) => g.status === "done" || (g.progress ?? 0) >= 100).length;

  const autoRows = autos.data ?? [];
  const automationsRun = autoRows.filter((a) => a.last_triggered_at).length;
  const automationsActive = autoRows.filter((a) => a.enabled).length;

  const focusMinutes = (sessions.data ?? []).reduce((n, s) => n + (s.minutes ?? 0), 0);

  const insightRows = insights.data ?? [];
  const accuracy = insightRows.length
    ? Math.round(insightRows.reduce((n, i) => n + (i.confidence ?? 0), 0) / insightRows.length)
    : 0;

  const memoryRows = memory.data ?? [];
  const imagesTotal = images.count ?? 0;
  const docsTotal = docs.count ?? 0;

  // Hours saved: conservative estimates per delegated artefact / automation run.
  const savedMinutes =
    automationsRun * 6 + tasksDone * 4 + imagesTotal * 12 + docsTotal * 20 + memoryRows.length * 2;

  // Top topics from thread titles (stopword-filtered word frequency).
  const STOP = new Set(
    "de la el los las un una y o que en con para por del al mi me te se lo es son como sobre nueva nuevo chat conversación conversacion sin más mas".split(
      " ",
    ),
  );
  const freq = new Map<string, number>();
  for (const t of threads.data ?? []) {
    for (const w of (t.title ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (w.length < 4 || STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  const topTopics = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

  const moduleFreq = new Map<string, number>();
  for (const t of threads.data ?? []) moduleFreq.set(t.module, (moduleFreq.get(t.module) ?? 0) + 1);
  const topModules = [...moduleFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, c]) => ({ module: m, count: c }));

  return {
    tasksDone,
    tasksOpen,
    goalsDone,
    goalsTotal: goalRows.length,
    automationsRun,
    automationsActive,
    automationsTotal: autoRows.length,
    focusMinutes,
    accuracy,
    memoryCount: memoryRows.length,
    memoryHits: memoryRows.reduce((n, m) => n + (m.hits ?? 0), 0),
    imagesTotal,
    docsTotal,
    savedMinutes,
    topTopics,
    topModules,
  };
}

export function useDeepStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deep-stats", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: loadDeepStats,
  });
}
