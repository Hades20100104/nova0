import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Aggregate real counts from the user's database so every section can display
 * live data (not decorative placeholders). Uses head+count queries in parallel.
 */
export function useModuleStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-stats", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const c = (table: string, extra?: (q: ReturnType<typeof supabase.from>) => unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase.from(table as never).select("*", { count: "exact", head: true });
        if (extra) q = extra(q);
        return q.then((r: { count: number | null }) => r.count ?? 0);
      };

      const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

      const [
        threadsTotal,
        threadsWeek,
        messagesTotal,
        messagesWeek,
        memoryTotal,
        imagesTotal,
        imagesWeek,
        docsTotal,
        contactsTotal,
        automationsTotal,
        automationsEnabled,
      ] = await Promise.all([
        c("assistant_threads"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c("assistant_threads", (q: any) => q.gte("created_at", since(7))),
        c("assistant_messages"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c("assistant_messages", (q: any) => q.gte("created_at", since(7))),
        c("user_memory"),
        c("generated_images"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c("generated_images", (q: any) => q.gte("created_at", since(7))),
        c("generated_documents"),
        c("whatsapp_contacts"),
        c("automations"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c("automations", (q: any) => q.eq("enabled", true)),
      ]);

      // Latest thread for "última actividad"
      const { data: latest } = await supabase
        .from("assistant_threads")
        .select("updated_at, module, assistant, title")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Message activity by day of week (last 30 days) for charts
      const { data: recentMsgs } = await supabase
        .from("assistant_messages")
        .select("created_at")
        .gte("created_at", since(30))
        .limit(2000);

      const byDay = Array(7).fill(0) as number[];
      for (const m of recentMsgs ?? []) {
        const d = new Date(m.created_at).getDay();
        byDay[d] += 1;
      }
      const maxDay = Math.max(1, ...byDay);

      return {
        threadsTotal,
        threadsWeek,
        messagesTotal,
        messagesWeek,
        memoryTotal,
        imagesTotal,
        imagesWeek,
        docsTotal,
        contactsTotal,
        automationsTotal,
        automationsEnabled,
        latest,
        activityByDay: byDay,
        activityMaxDay: maxDay,
      };
    },
  });
}

/** Client-side performance / device sampler (real, not fake). */
export function useLivePerf() {
  const [perf, setPerf] = useState({
    memMB: 0,
    memPct: 0,
    cores: 0,
    online: true,
    downlink: 0,
    heapLimitMB: 0,
    fps: 60,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 1000) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mem = (performance as any).memory;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = (navigator as any).connection;
        const memMB = mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : 0;
        const heapLimitMB = mem ? +(mem.jsHeapSizeLimit / 1048576).toFixed(0) : 0;
        setPerf({
          memMB,
          heapLimitMB,
          memPct: heapLimitMB ? Math.min(100, Math.round((memMB / heapLimitMB) * 100)) : 0,
          cores: navigator.hardwareConcurrency || 0,
          online: navigator.onLine,
          downlink: conn?.downlink ?? 0,
          fps: frames,
        });
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return perf;
}
