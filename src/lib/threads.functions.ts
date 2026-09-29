import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Assistant = z.enum(["nova", "nevira"]);

export const listThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ assistant: Assistant }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("assistant_threads")
      .select("id, title, module, updated_at, created_at")
      .eq("assistant", data.assistant)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { threads: rows ?? [] };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      assistant: Assistant,
      module: z.string().max(40).default("home"),
      title: z.string().min(1).max(120).default("Nueva conversación"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("assistant_threads")
      .insert({
        user_id: userId,
        assistant: data.assistant,
        module: data.module,
        title: data.title,
      })
      .select("id, title, module, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { thread: row };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: thread, error: tErr } = await supabase
      .from("assistant_threads")
      .select("id, assistant, module, title, updated_at")
      .eq("id", data.threadId)
      .single();
    if (tErr || !thread) throw new Error("Thread not found");
    const { data: messages, error: mErr } = await supabase
      .from("assistant_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { thread, messages: messages ?? [] };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("assistant_threads").delete().eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateThreadModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ threadId: z.string().uuid(), module: z.string().max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("assistant_threads")
      .update({ module: data.module, updated_at: new Date().toISOString() })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
