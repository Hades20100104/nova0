import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LayoutSchema, SOURCE_WHITELIST, type SourceKey } from "./section-blocks";
import { z } from "zod";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `sec-${Date.now().toString(36)}`;

/* ---------- CRUD ---------- */

export const listSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_sections")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { sections: data ?? [] };
  });

export const getSection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("user_sections")
      .select("*")
      .eq("user_id", context.userId)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { section: row };
  });

const CreateInput = z.object({
  assistant: z.enum(["nova", "nevira"]),
  label: z.string().min(1).max(60),
  slug: z.string().max(40).optional(),
  icon: z.string().max(40).optional(),
  accent: z.string().max(40).optional(),
  layout: LayoutSchema,
  created_by: z.enum(["user", "ai"]).default("user"),
});

export const createSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ context, data }) => {
    const slug = data.slug ? slugify(data.slug) : slugify(data.label);
    const { data: row, error } = await context.supabase
      .from("user_sections")
      .insert({
        user_id: context.userId,
        assistant: data.assistant,
        slug,
        label: data.label,
        icon: data.icon ?? null,
        accent: data.accent ?? null,
        layout: data.layout as unknown as Record<string, unknown>,
        created_by: data.created_by,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { section: row };
  });

const UpdateInput = z.object({
  slug: z.string().min(1).max(40),
  patch: z.object({
    label: z.string().min(1).max(60).optional(),
    icon: z.string().max(40).optional(),
    accent: z.string().max(40).optional(),
    layout: LayoutSchema.optional(),
    status: z.enum(["active", "archived"]).optional(),
  }),
});

export const updateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (patch.layout) patch.layout = patch.layout as unknown;
    const { data: row, error } = await context.supabase
      .from("user_sections")
      .update(patch)
      .eq("user_id", context.userId)
      .eq("slug", data.slug)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { section: row };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("user_sections")
      .delete()
      .eq("user_id", context.userId)
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Whitelisted source resolver ---------- */

const ResolveInput = z.object({
  source: z.enum(SOURCE_WHITELIST),
  limit: z.number().int().min(1).max(30).optional(),
  range: z.number().int().min(7).max(90).optional(),
});

export const resolveSectionSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResolveInput.parse(d))
  .handler(async ({ context, data }) => {
    const uid = context.userId;
    const sb = context.supabase;
    const src = data.source as SourceKey;

    if (src.startsWith("count:")) {
      const table = src.split(":")[1] as
        | "generated_documents"
        | "generated_images"
        | "user_memory"
        | "whatsapp_contacts"
        | "assistant_threads";
      const { count, error } = await sb
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      if (error) throw new Error(error.message);
      return { kind: "count" as const, value: count ?? 0 };
    }

    const limit = data.limit ?? 6;

    switch (src) {
      case "query:images.recent": {
        const { data: rows, error } = await sb
          .from("generated_images")
          .select("id, prompt, public_url, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        return {
          kind: "list" as const,
          items: (rows ?? []).map((r) => ({
            id: r.id,
            title: r.prompt ?? "Imagen",
            image: r.public_url ?? undefined,
            subtitle: new Date(r.created_at).toLocaleDateString(),
          })),
        };
      }
      case "query:documents.recent": {
        const { data: rows, error } = await sb
          .from("generated_documents")
          .select("id, title, format, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        return {
          kind: "list" as const,
          items: (rows ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            subtitle: `${r.format?.toUpperCase() ?? "DOC"} · ${new Date(
              r.created_at,
            ).toLocaleDateString()}`,
          })),
        };
      }
      case "query:memory.recent": {
        const { data: rows, error } = await sb
          .from("user_memory")
          .select("id, key, value, updated_at")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        return {
          kind: "list" as const,
          items: (rows ?? []).map((r) => ({
            id: r.id,
            title: r.key,
            subtitle: (r.value ?? "").slice(0, 80),
          })),
        };
      }
      case "query:threads.recent": {
        const { data: rows, error } = await sb
          .from("assistant_threads")
          .select("id, title, updated_at, assistant")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        return {
          kind: "list" as const,
          items: (rows ?? []).map((r) => ({
            id: r.id,
            title: r.title ?? "Conversación",
            subtitle: `${r.assistant} · ${new Date(r.updated_at).toLocaleDateString()}`,
          })),
        };
      }
      case "query:messages.by_day": {
        const range = data.range ?? 30;
        const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
        // messages are joined to threads via thread_id (owned by user via RLS)
        const { data: rows, error } = await sb
          .from("assistant_messages")
          .select("created_at, thread_id, assistant_threads!inner(user_id)")
          .eq("assistant_threads.user_id", uid)
          .gte("created_at", since);
        if (error) throw new Error(error.message);
        const buckets = new Map<string, number>();
        for (const r of rows ?? []) {
          const day = new Date(r.created_at).toISOString().slice(0, 10);
          buckets.set(day, (buckets.get(day) ?? 0) + 1);
        }
        const series = Array.from({ length: range }, (_, i) => {
          const d = new Date(Date.now() - (range - 1 - i) * 24 * 60 * 60 * 1000);
          const day = d.toISOString().slice(0, 10);
          return { day, value: buckets.get(day) ?? 0 };
        });
        return { kind: "chart" as const, series };
      }
      default:
        throw new Error("Fuente no permitida");
    }
  });

/* ---------- Skills ---------- */

const AttachInput = z.object({
  section_slug: z.string().max(40).optional(),
  name: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "snake_case"),
  description: z.string().min(1).max(400),
  code: z.string().min(1).max(6000),
});

export const attachSectionSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AttachInput.parse(d))
  .handler(async ({ context, data }) => {
    // upsert by (user_id, name)
    const { data: existing } = await context.supabase
      .from("agent_skills")
      .select("id")
      .eq("user_id", context.userId)
      .eq("name", data.name)
      .maybeSingle();
    const payload = {
      user_id: context.userId,
      name: data.name,
      description: data.description,
      code: data.code,
      section_slug: data.section_slug ?? null,
      enabled: true,
    };
    if (existing) {
      const { error } = await context.supabase
        .from("agent_skills")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id };
    }
    const { data: row, error } = await context.supabase
      .from("agent_skills")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });
