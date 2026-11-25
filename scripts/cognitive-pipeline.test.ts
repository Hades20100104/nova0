import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";
import { classifyIntent, immediatePreferences } from "../src/lib/cognitive/intent";
import { CognitivePipeline } from "../src/lib/cognitive/pipeline";
import { assembleContext, selectRelevant } from "../src/lib/cognitive/context";
import { COGNITIVE_STAGES } from "../src/lib/cognitive/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";

const message = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

describe("Intent Engine", () => {
  test("classifies an urgent direct Spotify action before tool execution", () => {
    const intent = classifyIntent(
      [message("Reproduce una canción en Spotify ahora mismo")],
      "musica",
    );
    expect(intent).toMatchObject({
      taskType: "action",
      executionMode: "direct_action",
      urgency: "high",
      domains: ["music"],
      requiresPlanning: false,
    });
    expect(intent.requiredSkills).toContain("search_music");
  });
  test("a question about creation is not authorization to act", () => {
    expect(
      classifyIntent([message("¿Cómo crear un evento en el calendario?")], "calendario")
        .executionMode,
    ).toBe("respond");
  });
  test("multi-domain work requires planning", () => {
    const intent = classifyIntent(
      [message("Crea tareas y eventos en mi calendario")],
      "productividad",
    );
    expect(intent.requiresPlanning).toBe(true);
    expect(intent.domains).toEqual(expect.arrayContaining(["productivity", "calendar"]));
    expect(intent.executionMode).toBe("plan");
  });
  test("follow-ups inherit the preceding user goal", () => {
    expect(
      classifyIntent([message("Crea un documento Word"), message("Sí, hazlo")], "documentos")
        .requiredSkills,
    ).toContain("generate_office_document");
    expect(classifyIntent([message("Hazlo")], "home").needsClarification).toBe(true);
  });
  test("immediate preferences are explicit and not persistent instructions", () => {
    expect(immediatePreferences("Contesta breve, en inglés y sin emojis")).toEqual([
      "respuesta breve",
      "sin emojis",
      "idioma inglés",
    ]);
  });
});

describe("Context Engine", () => {
  test("relevant memories outrank recent unrelated ones", () => {
    const rows = [
      { key: "viaje", value: "Roma" },
      { key: "musica", value: "Spotify jazz" },
    ];
    expect(
      selectRelevant(rows, "Reproduce jazz en Spotify", (row) => `${row.key} ${row.value}`),
    ).toEqual([rows[1]]);
  });
  test("preserves general preferences without inserting unrelated facts", () => {
    const rows = [
      { key: "tono", value: "conciso", preference: true },
      { key: "viaje", value: "Roma", preference: false },
    ];
    expect(
      selectRelevant(
        rows,
        "mis gastos",
        (row) => row.value,
        (row) => row.preference,
      ),
    ).toEqual([rows[0]]);
  });
  test("queries owner-scoped relevant sources only, and degrades on source failure", async () => {
    const calls: Array<{ table: string; columns: string; filters: Array<[string, unknown]> }> = [];
    const fake = {
      from(table: string) {
        const call = { table, columns: "", filters: [] as Array<[string, unknown]> };
        calls.push(call);
        const builder = {
          select(columns: string) {
            call.columns = columns;
            return builder;
          },
          eq(column: string, value: unknown) {
            call.filters.push([column, value]);
            return builder;
          },
          order() {
            return builder;
          },
          limit() {
            return Promise.resolve({
              data: [],
              error: table === "user_memory" ? { message: "unavailable" } : null,
            });
          },
        };
        return builder;
      },
    };
    // Boundary mock implements only the query surface needed by this real context path.
    const result = await assembleContext({
      supabase: fake as unknown as SupabaseClient<Database>,
      userId: "owner-a",
      assistant: "nova",
      module: "musica",
      threadId: "thread-a",
      messages: [message("Busca jazz en Spotify")],
      intent: classifyIntent([message("Busca jazz en Spotify")], "musica"),
    });
    expect(
      calls.every((call) =>
        call.filters.some(([column, value]) => column === "user_id" && value === "owner-a"),
      ),
    ).toBe(true);
    expect(calls.some((call) => call.table === "spotify_connections")).toBe(true);
    expect(calls.some((call) => call.table === "finance_transactions")).toBe(false);
    expect(calls.some((call) => /access_token|refresh_token/.test(call.columns))).toBe(false);
    expect(result.sources.find((source) => source.source === "memory")?.status).toBe("unavailable");
    expect(result.prompt).toContain("thread-a");
  });
});

describe("Cognitive orchestrator", () => {
  test("enforces all eight stages in order with explicit deferred planner", async () => {
    const pipeline = new CognitivePipeline();
    expect(() => pipeline.begin("tools_skills")).toThrow();
    const order: string[] = [];
    for (const stage of COGNITIVE_STAGES) {
      if (stage === "planner") pipeline.defer(stage, "future planner");
      else
        await pipeline.run(
          stage,
          () => {
            order.push(stage);
            return stage;
          },
          (value) => value,
        );
    }
    expect(order.indexOf("intent")).toBeLessThan(order.indexOf("context"));
    expect(order.indexOf("context")).toBeLessThan(order.indexOf("agent_selector"));
    expect(pipeline.trace.status).toBe("completed");
    expect(pipeline.trace.stages[2]?.status).toBe("deferred");
    expect(pipeline.trace.stages.map((entry) => entry.stage)).toEqual([...COGNITIVE_STAGES]);
  });
  test("failure blocks execution of later stages", async () => {
    const pipeline = new CognitivePipeline();
    await expect(
      pipeline.run(
        "intent",
        () => {
          throw new Error("failed");
        },
        String,
      ),
    ).rejects.toThrow();
    expect(pipeline.trace.status).toBe("failed");
    expect(pipeline.trace.stages.find((stage) => stage.stage === "tools_skills")?.status).toBe(
      "skipped",
    );
    expect(() => pipeline.begin("context")).toThrow();
  });
  test("cancellation remains terminal and traces are request-isolated", () => {
    const first = new CognitivePipeline();
    const second = new CognitivePipeline();
    first.begin("intent");
    first.terminate("cancelled");
    first.terminate("failed");
    expect(first.trace.status).toBe("cancelled");
    expect(second.trace.status).toBe("running");
    expect(first.trace.runId).not.toBe(second.trace.runId);
    const snapshot = second.snapshot();
    snapshot.status = "failed";
    expect(second.trace.status).toBe("running");
  });
});
