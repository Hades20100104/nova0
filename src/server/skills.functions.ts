import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

const NAME_RE = /^[a-z][a-z0-9_]{1,40}$/;

interface SaveInput {
  name: string;
  description: string;
  code: string;
  paramsSchema?: Record<string, unknown>;
}

interface ToggleInput {
  id: string;
  enabled: boolean;
}

interface DeleteInput {
  id: string;
}

interface BumpInput {
  name: string;
}

export const listSkills = createServerFn({ method: "GET" })
  .middleware([withSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("agent_skills")
      .select("id,name,description,code,params_schema,enabled,usage_count,last_used_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { skills: data ?? [] };
  });

export const saveSkill = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: SaveInput): SaveInput => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (typeof input.name !== "string" || !NAME_RE.test(input.name)) {
      throw new Error("Nombre inválido (snake_case, 2-41 chars)");
    }
    if (typeof input.description !== "string" || input.description.length < 5 || input.description.length > 300) {
      throw new Error("Descripción inválida (5-300 chars)");
    }
    if (typeof input.code !== "string" || input.code.length < 5 || input.code.length > 8000) {
      throw new Error("Código inválido");
    }
    if (input.paramsSchema != null && typeof input.paramsSchema !== "object") {
      throw new Error("paramsSchema inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("agent_skills")
      .upsert(
        {
          user_id: userId,
          name: data.name,
          description: data.description,
          code: data.code,
          params_schema: data.paramsSchema ?? {},
          enabled: true,
        },
        { onConflict: "user_id,name" },
      )
      .select()
      .single();
    if (error) throw error;
    return { skill: row };
  });

export const toggleSkill = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: ToggleInput): ToggleInput => {
    if (typeof input?.id !== "string" || typeof input?.enabled !== "boolean") {
      throw new Error("Payload inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_skills")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteSkill = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: DeleteInput): DeleteInput => {
    if (typeof input?.id !== "string") throw new Error("Payload inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agent_skills").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const bumpSkillUsage = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: BumpInput): BumpInput => {
    if (typeof input?.name !== "string") throw new Error("Payload inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("agent_skills")
      .select("id,usage_count")
      .eq("user_id", userId)
      .eq("name", data.name)
      .maybeSingle();
    if (row) {
      await supabase
        .from("agent_skills")
        .update({ usage_count: (row.usage_count ?? 0) + 1, last_used_at: new Date().toISOString() })
        .eq("id", row.id);
    }
    return { ok: true };
  });
