import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { ASSISTANT_PERSONAS, getModule } from "@/lib/modules";
import { buildChatTools } from "@/lib/chat-tools";
import type { Database } from "@/integrations/supabase/types";

type Body = {
  messages?: UIMessage[];
  threadId?: string;
  assistant?: "nova" | "nevira";
  module?: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const { messages, threadId, assistant, module } = body;

        if (!Array.isArray(messages) || !threadId || !assistant) {
          return new Response("Bad request", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
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

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const moduleDef = getModule(assistant, module ?? "home");
        const system = `${ASSISTANT_PERSONAS[assistant]}\n\nContexto activo: ${moduleDef.label}.\n${moduleDef.systemPrompt}`;

        // Persist the latest user message (only the most recent one to avoid duplicates)
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          // Check if it's already saved
          const { data: existing } = await supabase
            .from("assistant_messages")
            .select("id")
            .eq("thread_id", threadId)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1);

          const lastPartsStr = JSON.stringify(lastUser.parts);
          const isDup =
            existing?.[0] &&
            JSON.stringify((existing[0] as unknown as { parts?: unknown }).parts ?? null) === lastPartsStr;
          if (!isDup) {
            await supabase.from("assistant_messages").insert({
              thread_id: threadId,
              role: "user",
              parts: lastUser.parts as unknown as Database["public"]["Tables"]["assistant_messages"]["Insert"]["parts"],
            });
            await supabase
              .from("assistant_threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId);
          }
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onFinish: async ({ messages: finalMessages }) => {
            const assistantMsg = [...finalMessages].reverse().find((m) => m.role === "assistant");
            if (assistantMsg) {
              await supabase.from("assistant_messages").insert({
                thread_id: threadId,
                role: "assistant",
                parts: assistantMsg.parts as unknown as Database["public"]["Tables"]["assistant_messages"]["Insert"]["parts"],
              });
              await supabase
                .from("assistant_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            }
          },
        });
      },
    },
  },
});
