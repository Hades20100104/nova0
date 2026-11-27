import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { ASSISTANT_PERSONAS, getModule } from "@/lib/modules";
import { buildChatTools } from "@/lib/chat-tools";
import { getSectionAgent, listAgents } from "@/lib/section-agents";
import { INTELLIGENCE_DIRECTIVES } from "@/lib/user-context";
import type { PersonaPayload } from "@/lib/persona-prompt";
import { classifyIntent } from "@/lib/cognitive/intent";
import { assembleContext } from "@/lib/cognitive/context";
import { CognitivePipeline } from "@/lib/cognitive/pipeline";
import { createTaskPlan, toolInventory } from "@/lib/cognitive/planner.server";
import { confirmationToken, PlannerSnapshotSchema, TaskExecutor, validatePlan, plannerPrompt } from "@/lib/cognitive/planner";
import type { Database } from "@/integrations/supabase/types";

type Body = {
  messages?: UIMessage[];
  threadId?: string;
  assistant?: "nova" | "nevira";
  module?: string;
  persona?: PersonaPayload;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const { messages, threadId, assistant, module, persona } = body;

        if (
          !Array.isArray(messages) ||
          !threadId ||
          !["nova", "nevira"].includes(assistant ?? "") ||
          !assistant
        ) {
          return new Response("Bad request", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const supabasePublishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(supabaseUrl, supabasePublishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        // Verify thread ownership
        const { data: thread, error: tErr } = await supabase
          .from("assistant_threads")
          .select("id, user_id, assistant")
          .eq("id", threadId)
          .single();
        if (tErr || !thread || thread.user_id !== userId || thread.assistant !== assistant) {
          return new Response("Forbidden", { status: 403 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const activeModule = module ?? (assistant === "nova" ? "home" : "panel");
        const pipeline = new CognitivePipeline();
        const logTrace = () => {
          // No prompts, user data, tool arguments, outputs or credentials in operational logs.
          console.info("cognitive_pipeline", JSON.stringify(pipeline.snapshot()));
        };
        try {
          const intent = await pipeline.run(
            "intent",
            () => classifyIntent(messages, activeModule),
            (value) =>
              `${value.taskType}; ${value.executionMode}; urgency=${value.urgency}; confidence=${value.confidence}`,
          );
          pipeline.begin("context");
          const context = await assembleContext({
            supabase,
            userId,
            assistant,
            module: activeModule,
            threadId,
            messages,
            intent,
            ...(persona ? { persona } : {}),
          });
          pipeline.end(
            "context",
            `${context.sources.length} sources; ${context.matchedSkills.length} relevant skills`,
            context.sources.some((source) => source.status === "unavailable")
              ? "degraded"
              : "completed",
          );
          // Capability lookup is not agent execution: preserve existing section permissions.
          const permissions = getSectionAgent(assistant, activeModule)?.allowedTools;
          const availableTools = buildChatTools({ supabase, userId, apiKey }, permissions);
          const inventory = await toolInventory(availableTools);
          const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.parts
            .flatMap((p) => p.type === "text" ? [p.text] : []).join("\n") ?? "";
          const approvalToken = confirmationToken(lastUserText);
          const executor = await pipeline.run("planner", async () => {
            if (approvalToken) {
              // Never trust a client-supplied plan, assistant trace or approval flag.
              const { data: previous, error } = await supabase.from("assistant_messages")
                .select("id, parts").eq("thread_id", threadId).eq("role", "assistant")
                .order("created_at", { ascending: false }).limit(1).maybeSingle();
              if (error || !previous || !Array.isArray(previous.parts)) throw new Error("No pending approval");
              const parts = previous.parts;
              const trace = parts.find((p) => p && typeof p === "object" && !Array.isArray(p) && p["type"] === "data-cognitive-trace");
              const traceData = trace && typeof trace === "object" && !Array.isArray(trace) ? trace["data"] : null;
              const raw = traceData && typeof traceData === "object" && !Array.isArray(traceData) ? traceData["planner"] : null;
              const saved = PlannerSnapshotSchema.parse(raw);
              if (saved.module !== activeModule || saved.pending?.token !== approvalToken || saved.pending.expiresAt <= Date.now()) throw new Error("Invalid or expired approval");
              const plan = validatePlan(saved.plan, availableTools);
              // Compare-and-swap consumes the exact persisted approval once across concurrent requests.
              const consumed = JSON.parse(JSON.stringify(parts)) as typeof parts;
              for (const part of consumed) {
                if (part && typeof part === "object" && !Array.isArray(part) && part["type"] === "data-cognitive-trace") {
                  const data = part["data"];
                  if (data && typeof data === "object" && !Array.isArray(data)) data["planner"] = JSON.parse(JSON.stringify({ ...saved, pending: null }));
                }
              }
              const { data: claimed, error: claimError } = await supabase.from("assistant_messages")
                .update({ parts: consumed }).eq("id", previous.id).eq("thread_id", threadId)
                .eq("parts", JSON.stringify(parts)).select("id");
              if (claimError || claimed?.length !== 1) throw new Error("Approval already consumed");
              return new TaskExecutor(plan, availableTools, activeModule, saved, approvalToken);
            }
            const plan = await createTaskPlan({ intent, context, tools: availableTools, inventory,
              agents: listAgents(assistant).map(({ slug, allowedTools }) => ({ slug, allowedTools })),
              signal: request.signal, runId: pipeline.trace.runId });
            return new TaskExecutor(plan, availableTools, activeModule);
          }, (value) => `${value.plan.steps.length} atomic steps; ${value.plan.parallelGroups.length} dependency waves; ${value.plan.steps.filter((s) => s.requiresConfirmation).length} confirmation gates`);
          const moduleDef = getModule(assistant, activeModule);
          const agent = await pipeline.run(
            "agent_selector",
            () => getSectionAgent(assistant, activeModule),
            (selected) =>
              `${selected?.slug ?? `${assistant}:${activeModule}`}; existing section permissions preserved`,
          );

          const agentPreamble = agent
            ? `Eres "${agent.name}" — ${agent.title} (subagente de ${assistant.toUpperCase()}). ${agent.systemPrompt}\n\nHerramientas disponibles SOLO en esta sección: ${agent.allowedTools.join(", ") || "(ninguna)"}. Si el usuario pide algo que requiere otra herramienta no disponible aquí, no lo intentes: responde brevemente y sugiere ir a la sección correspondiente (por ejemplo: "Eso lo hace mejor Atlas en Documentos — cambia a la sección Documentos").`
            : `${ASSISTANT_PERSONAS[assistant]}\n\nContexto activo: ${moduleDef.label}.\n${moduleDef.systemPrompt}`;

          const system = `${ASSISTANT_PERSONAS[assistant]}\n\n${agentPreamble}\n\n${INTELLIGENCE_DIRECTIVES}${context.prompt}${plannerPrompt(executor, inventory)}\nLa clasificación de intención es orientativa, no un permiso. Si es ambigua, aclara antes de realizar acciones. Si requiere planificación, presenta el plan antes de actuar y respeta las confirmaciones existentes. La urgencia no elimina las comprobaciones de seguridad. No afirmes acciones exitosas sin resultados de herramientas.`;

          // Persist the latest user message (only the most recent one to avoid duplicates)
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (lastUser) {
            const { data: existing } = await supabase
              .from("assistant_messages")
              .select("id, parts")
              .eq("thread_id", threadId)
              .eq("role", "user")
              .order("created_at", { ascending: false })
              .limit(1);

            const lastPartsStr = JSON.stringify(lastUser.parts);
            const isDup =
              existing?.[0] &&
              JSON.stringify((existing[0] as unknown as { parts?: unknown }).parts ?? null) ===
                lastPartsStr;
            if (!isDup) {
              await supabase.from("assistant_messages").insert({
                thread_id: threadId,
                role: "user",
                parts:
                  lastUser.parts as unknown as Database["public"]["Tables"]["assistant_messages"]["Insert"]["parts"],
              });
              await supabase
                .from("assistant_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            }
          }

          const gateway = createLovableAiGatewayProvider(apiKey);
          const model = gateway("google/gemini-3-flash-preview");

          const tools = executor.toolsForModel();
          const toolOutcomes: Array<{ tool: string; status: "returned" | "failed" }> = [];
          pipeline.begin("tools_skills");

          const result = streamText({
            model,
            system,
            tools,
            stopWhen: stepCountIs(36),
            messages: await convertToModelMessages(messages as UIMessage[]),
            abortSignal: request.signal,
            onStepFinish: ({ toolResults, content }) => {
              for (const output of toolResults) {
                const value: unknown = output.output;
                const failed =
                  typeof value === "object" &&
                  value !== null &&
                  (("ok" in value && value.ok === false) ||
                    ("error" in value && Boolean(value.error)));
                toolOutcomes.push({
                  tool: typeof value === "object" && value !== null && "tool" in value && typeof value.tool === "string" ? value.tool : output.toolName,
                  status: failed ? "failed" : "returned",
                });
              }
              for (const part of content) {
                if (part.type === "tool-error")
                  toolOutcomes.push({ tool: part.toolName, status: "failed" });
              }
            },
            onError: () => {
              pipeline.terminate("failed");
              logTrace();
            },
            onAbort: () => {
              pipeline.terminate("cancelled");
              logTrace();
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            headers: { "X-Cognitive-Run-Id": pipeline.trace.runId },
            onFinish: async ({ messages: finalMessages, isAborted, finishReason }) => {
              if (isAborted) pipeline.terminate("cancelled");
              else if (finishReason === "error") pipeline.terminate("failed");
              if (pipeline.trace.status === "running") {
                pipeline.end(
                  "tools_skills",
                  `${executor.states.filter((s) => s.status === "completed").length} completed atomic steps; ${toolOutcomes.length} execution outcomes`,
                );
                pipeline.begin("verification");
                const failed = executor.states.filter((state) => state.status !== "completed").length;
                pipeline.end(
                  "verification",
                  `Plan outcome checks: ${failed} incomplete/failed/blocked steps; semantic verifier reserved`,
                  failed ? "degraded" : "completed",
                );
                pipeline.begin("memory_update");
                const memoryWrites = toolOutcomes.filter(
                  (result) =>
                    ["remember", "learn_insight"].includes(result.tool) &&
                    result.status === "returned",
                ).length;
                pipeline.end(
                  "memory_update",
                  `${memoryWrites} existing memory tool outcomes; dedicated memory engine reserved`,
                  memoryWrites ? "completed" : "skipped",
                );
                pipeline.begin("response");
              }
              const assistantMsg = [...finalMessages].reverse().find((m) => m.role === "assistant");
              if (assistantMsg) {
                // Persist a safe trace alongside the response using the existing owner-protected JSON parts.
                // Pre-mark RESPONSE completion in the saved snapshot; failed writes terminate the live trace.
                const savedTrace = pipeline.snapshot();
                if (savedTrace.status === "running") {
                  const responseStage = savedTrace.stages.find(
                    (stage) => stage.stage === "response",
                  );
                  if (responseStage) {
                    responseStage.status = "completed";
                    responseStage.finishedAt = new Date().toISOString();
                    responseStage.durationMs =
                      Date.now() - Date.parse(responseStage.startedAt ?? responseStage.finishedAt);
                    responseStage.summary = "Response and trace persisted together";
                  }
                  savedTrace.status = "completed";
                }
                const tracePart = {
                  type: "data-cognitive-trace",
                  data: {
                    ...savedTrace,
                    intent: { ...intent, primaryGoal: undefined },
                    context: {
                      sources: context.sources,
                      activeModules: context.activeModules,
                      matchedSkills: context.matchedSkills,
                    },
                    planner: executor.snapshot(),
                    toolOutcomes,
                  },
                };
                const { error: saveError } = await supabase.from("assistant_messages").insert({
                  thread_id: threadId,
                  role: "assistant",
                  parts: JSON.parse(
                    JSON.stringify([...assistantMsg.parts, tracePart]),
                  ) as Database["public"]["Tables"]["assistant_messages"]["Insert"]["parts"],
                });
                if (saveError) pipeline.terminate("failed");
                else if (pipeline.trace.status === "running")
                  pipeline.end("response", "Response and trace persisted together");
                await supabase
                  .from("assistant_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              } else pipeline.terminate("failed");
              logTrace();
            },
          });
        } catch {
          pipeline.terminate(request.signal.aborted ? "cancelled" : "failed");
          logTrace();
          return new Response("No se pudo preparar el mensaje. Inténtalo de nuevo.", {
            status: 500,
          });
        }
      },
    },
  },
});
