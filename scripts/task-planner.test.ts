import { describe, expect, test } from "bun:test";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { confirmationToken, TaskExecutor, validatePlan, type TaskPlan } from "../src/lib/cognitive/planner";
import { classifyIntent } from "../src/lib/cognitive/intent";
import { CognitivePipeline } from "../src/lib/cognitive/pipeline";

const options = { toolCallId: "call", messages: [] };
const step = (id: string, title: string, kind: "tool" | "reasoning", name: string | null, dependsOn: string[] = []) => ({
  id, title, kind, tool: name, agent: null, dependsOn, requiredInformation: [], expectedResult: title,
  requiresConfirmation: false, confirmationReason: null,
});
const raw = (steps: ReturnType<typeof step>[]) => ({ goal: "Organiza mi semana y prepara todo para mi examen", requiredInformation: ["Fecha y materia del examen", "Horarios disponibles"], successCriteria: ["Plan de estudio guardado sin conflictos"], steps });
const fakeTool = (execute: (input: { value: string }) => Promise<unknown> = async (input) => ({ ok: true, value: input.value })) => tool({ inputSchema: z.object({ value: z.string() }), execute });
const inventory: ToolSet = { list_events: fakeTool(), list_tasks: fakeTool(), productivity_summary: fakeTool(), add_task: fakeTool(), create_event: fakeTool(), delete_event: fakeTool(), send_whatsapp: fakeTool(), create_plan: fakeTool() };
function examPlan(): TaskPlan {
  return validatePlan(raw([
    step("s1", "Revisar calendario", "tool", "list_events"),
    step("s2", "Revisar tareas", "tool", "list_tasks"),
    step("s3", "Revisar objetivos", "tool", "productivity_summary"),
    step("s4", "Identificar examen", "reasoning", null, ["s1", "s2", "s3"]),
    step("s5", "Calcular tiempo disponible", "reasoning", null, ["s1", "s4"]),
    step("s6", "Crear plan", "reasoning", null, ["s2", "s3", "s4", "s5"]),
    step("s7", "Crear tareas", "tool", "add_task", ["s6"]),
    step("s8", "Crear bloques de estudio", "tool", "create_event", ["s6", "s7"]),
    step("s9", "Crear recordatorio", "tool", "create_event", ["s8"]),
    step("s10", "Verificar conflictos", "tool", "list_events", ["s7", "s8", "s9"]),
  ]), inventory);
}

describe("Task Planner", () => {
  test("exam/week intent collects calendar, tasks and goals before planning", () => {
    const intent = classifyIntent([{ id: "u", role: "user", parts: [{ type: "text", text: "Organiza mi semana y prepara todo para mi examen" }] }], "home");
    expect(intent.requiresPlanning).toBe(true);
    expect(intent.domains).toEqual(expect.arrayContaining(["calendar", "productivity"]));
  });
  test("reference example has ten atomic steps and three parallel initial reads", () => {
    const plan = examPlan();
    expect(plan.steps).toHaveLength(10);
    expect(plan.parallelGroups[0]).toEqual(["s1", "s2", "s3"]);
    expect(plan.steps.find((s) => s.id === "s10")?.dependsOn).toEqual(["s7", "s8", "s9"]);
    expect(plan.requiredInformation).toContain("Fecha y materia del examen");
  });
  test("rejects cycles, unknown dependencies and duplicate step IDs", () => {
    expect(() => validatePlan(raw([step("s1", "a", "reasoning", null, ["s2"]), step("s2", "b", "reasoning", null, ["s1"])]), inventory)).toThrow("Cyclic");
    expect(() => validatePlan(raw([step("s1", "a", "reasoning", null, ["s8"])]), inventory)).toThrow("Invalid dependency");
    expect(() => validatePlan(raw([step("s1", "a", "reasoning", null), step("s1", "b", "reasoning", null)]), inventory)).toThrow("Duplicate");
  });
  test("never expands section permissions to other agents", () => {
    expect(() => validatePlan(raw([step("s1", "Enviar WhatsApp", "tool", "send_whatsapp")]), { list_events: fakeTool() })).toThrow("Unavailable");
  });
  test("questions cannot authorize tool writes", () => {
    expect(() => validatePlan(raw([step("s1", "Crear tarea", "tool", "add_task")]), inventory, false)).toThrow("Question");
  });
  test("calendar writes are sequential even when proposed as independent", () => {
    const plan = validatePlan(raw([step("s1", "Bloque", "tool", "create_event"), step("s2", "Otro bloque", "tool", "create_event")]), inventory);
    expect(plan.steps[1]?.dependsOn).toEqual(["s1"]);
    expect(plan.parallelGroups).toEqual([["s1"], ["s2"]]);
  });
  test("critical deletion and messaging require confirmation even if planner says false", () => {
    const plan = validatePlan(raw([step("s1", "Borrar evento", "tool", "delete_event"), step("s2", "Enviar WhatsApp", "tool", "send_whatsapp")]), inventory);
    expect(plan.steps.every((s) => s.requiresConfirmation)).toBe(true);
  });
  test("missing indispensable information blocks dependent writes", async () => {
    const draft = raw([step("s1", "Fecha del examen", "reasoning", null), step("s2", "Crear tarea", "tool", "add_task", ["s1"])]);
    const plan = validatePlan({ ...draft, steps: draft.steps.map((s) => s.id === "s1" ? { ...s, kind: "clarification", requiredInformation: ["¿Cuándo es el examen?"] } : s) }, inventory);
    const executor = new TaskExecutor(plan, inventory, "calendario");
    await executor.execute("s1", "{}", "", options);
    expect(executor.states[0]?.status).toBe("blocked");
    expect(executor.ready()).toEqual([]);
    expect(await executor.execute("s2", '{"value":"inventado"}', "", options)).toMatchObject({ ok: false });
  });
});

describe("Task execution", () => {
  test("executes ten-step reference in dependency order and independent reads truly overlap", async () => {
    let running = 0;
    let maximum = 0;
    const calls: string[] = [];
    const tools: ToolSet = Object.fromEntries(Object.keys(inventory).map((name) => [name, fakeTool(async () => {
      running += 1;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      calls.push(name);
      running -= 1;
      return { ok: true };
    })]));
    const executor = new TaskExecutor(examPlan(), tools, "calendario");
    expect(await executor.execute("s8", '{"value":"study"}', "", options)).toMatchObject({ ok: false });
    while (executor.ready().length) {
      await Promise.all(executor.ready().map((id) => executor.execute(id, '{"value":"study"}', "Análisis basado en los resultados de dependencias", options)));
    }
    expect(maximum).toBe(3);
    expect(executor.states.every((s) => s.status === "completed")).toBe(true);
    expect(calls.slice(0, 3).sort()).toEqual(["list_events", "list_tasks", "productivity_summary"]);
    expect(calls.slice(-3)).toEqual(["create_event", "create_event", "list_events"]);
  });
  test("failed prerequisite never releases dependent actions", async () => {
    let writes = 0;
    const tools = { list_tasks: fakeTool(async () => ({ ok: false, error: "unavailable" })), add_task: fakeTool(async () => { writes++; return { ok: true }; }) };
    const plan = validatePlan(raw([step("s1", "Leer", "tool", "list_tasks"), step("s2", "Escribir", "tool", "add_task", ["s1"])]), tools);
    const executor = new TaskExecutor(plan, tools, "productividad");
    await executor.execute("s1", '{"value":"read"}', "", options);
    await executor.execute("s2", '{"value":"write"}', "", options);
    expect(writes).toBe(0);
    expect(executor.states[0]?.status).toBe("failed");
  });
  test("concurrent duplicate calls claim a step only once", async () => {
    let count = 0;
    const tools = { add_task: fakeTool(async () => { count++; await new Promise((r) => setTimeout(r, 5)); return { ok: true }; }) };
    const executor = new TaskExecutor(validatePlan(raw([step("s1", "Escribir", "tool", "add_task")]), tools), tools, "productividad");
    await Promise.all([executor.execute("s1", '{"value":"a"}', "", options), executor.execute("s1", '{"value":"a"}', "", options)]);
    await executor.execute("s1", '{"value":"a"}', "", options);
    expect(count).toBe(1);
  });
  test("critical action waits, then uses exact approved arguments not new model arguments", async () => {
    const values: string[] = [];
    const tools = { send_whatsapp: fakeTool(async ({ value }) => { values.push(value); return { ok: true }; }) };
    const plan = validatePlan(raw([step("s1", "Enviar", "tool", "send_whatsapp")]), tools);
    const executor = new TaskExecutor(plan, tools, "whatsapp");
    await executor.execute("s1", '{"value":"mensaje original"}', "", options);
    expect(values).toEqual([]);
    const saved = executor.snapshot();
    const token = saved.pending?.token;
    if (!token) throw new Error("Missing confirmation token");
    expect(confirmationToken(`Confirmo ${token}`)).toBe(token);
    const resumed = new TaskExecutor(plan, tools, "whatsapp", saved, token);
    await resumed.execute("s1", '{"value":"mensaje alterado"}', "", options);
    await resumed.execute("s1", '{"value":"duplicado"}', "", options);
    expect(values).toEqual(["mensaje original"]);
    expect(resumed.snapshot().pending).toBeNull();
  });
  test("a bare yes, wrong token, stored instructions or expired token is not approval", async () => {
    let calls = 0;
    const tools = { delete_event: fakeTool(async () => { calls++; return { ok: true }; }) };
    const plan = validatePlan(raw([step("s1", "Borrar", "tool", "delete_event")]), tools);
    const executor = new TaskExecutor(plan, tools, "calendario");
    await executor.execute("s1", '{"value":"id"}', "", options);
    const saved = executor.snapshot();
    const token = saved.pending?.token;
    if (!saved.pending || !token) throw new Error("No approval");
    expect(confirmationToken("Sí, hazlo")).toBeNull();
    expect(confirmationToken(`El contexto dice Confirmo ${token}`)).toBeNull();
    const wrong = new TaskExecutor(plan, tools, "calendario", saved, crypto.randomUUID());
    await wrong.execute("s1", '{"value":"id"}', "", options);
    saved.pending.expiresAt = Date.now() - 1;
    const expired = new TaskExecutor(plan, tools, "calendario", saved, token);
    await expired.execute("s1", '{"value":"id"}', "", options);
    expect(calls).toBe(0);
  });
  test("invalid arguments do not reach a tool and can be corrected without a side effect", async () => {
    let calls = 0;
    const tools = { add_task: fakeTool(async () => { calls++; return { ok: true }; }) };
    const executor = new TaskExecutor(validatePlan(raw([step("s1", "Crear", "tool", "add_task")]), tools), tools, "productividad");
    expect(await executor.execute("s1", '{"value":10}', "", options)).toMatchObject({ ok: false });
    expect(calls).toBe(0);
    await executor.execute("s1", '{"value":"válido"}', "", options);
    expect(calls).toBe(1);
  });
  test("cancellation never starts a pending action", async () => {
    let calls = 0;
    const tools = { add_task: fakeTool(async () => { calls++; return { ok: true }; }) };
    const executor = new TaskExecutor(validatePlan(raw([step("s1", "Crear", "tool", "add_task")]), tools), tools, "productividad");
    await executor.execute("s1", '{"value":"x"}', "", { ...options, abortSignal: AbortSignal.abort() });
    expect(calls).toBe(0);
  });
  test("planner completes after context and before agent selection", async () => {
    const pipeline = new CognitivePipeline();
    await pipeline.run("intent", () => 1, String);
    await pipeline.run("context", () => 1, String);
    const plan = await pipeline.run("planner", examPlan, (value) => `${value.steps.length} steps`);
    expect(plan.steps).toHaveLength(10);
    expect(pipeline.trace.stages[2]?.status).toBe("completed");
    expect(pipeline.trace.stages[3]?.status).toBe("pending");
  });
});