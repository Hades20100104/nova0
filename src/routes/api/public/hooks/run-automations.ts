import { createFileRoute } from "@tanstack/react-router";

const BATCH = 20;

/**
 * Persistent scheduler, called by pg_cron. Idempotent: only automations that
 * are due run, and each one is claimed atomically via last_triggered_at so
 * replays or overlapping calls never execute the same automation twice.
 */
export const Route = createFileRoute("/api/public/hooks/run-automations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { isDueServer, executeSteps } = await import("@/lib/automation-engine.server");

        const { data, error } = await supabaseAdmin
          .from("automations")
          .select("*")
          .eq("enabled", true)
          .in("trigger_type", ["interval", "time"])
          .limit(500);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const now = new Date();
        type A = import("@/lib/automations.functions").Automation & { user_id: string };
        const due = ((data ?? []) as unknown as A[]).filter((a) => isDueServer(a, now)).slice(0, BATCH);
        let ran = 0;

        for (const a of due) {
          // Atomic claim: only succeeds if nobody ran it since we read it.
          let q = supabaseAdmin
            .from("automations")
            .update({ last_triggered_at: now.toISOString(), last_state: "Ejecutando…" } as never)
            .eq("id", a.id);
          q = a.last_triggered_at ? q.eq("last_triggered_at", a.last_triggered_at) : q.is("last_triggered_at", null);
          const { data: claimed } = await q.select("id");
          if (!claimed?.length) continue;

          const res = await executeSteps(supabaseAdmin, a.user_id, a);
          const state = res.log.join(" · ").slice(0, 900);
          await supabaseAdmin.from("automations").update({ last_state: state } as never).eq("id", a.id);
          await supabaseAdmin.from("automation_runs").insert({
            automation_id: a.id,
            user_id: a.user_id,
            source: "scheduler",
            status: res.failed ? "error" : "ok",
            log: state,
          });
          ran++;
        }

        return Response.json({ ok: true, checked: data?.length ?? 0, ran });
      },
    },
  },
});
