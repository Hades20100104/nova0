import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";

/* ------------ USER SEARCH ------------ */
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const term = data.q.replace(/^@/, "").trim().toLowerCase();
    if (!term) return { users: [] };
    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .neq("id", context.userId)
      .limit(15);
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

export const setMyUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, "solo a-z 0-9 _") })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ username: data.username.toLowerCase() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, username: data.username.toLowerCase() };
  });

/* ------------ ROOMS ------------ */
export const listMyRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberships } = await context.supabase
      .from("chat_members")
      .select("room_id")
      .eq("user_id", context.userId);
    const ids = (memberships ?? []).map((m) => (m as { room_id: string }).room_id);
    if (!ids.length) return { rooms: [] };
    const { data: rooms, error } = await context.supabase
      .from("chat_rooms")
      .select("id, kind, name, avatar_url, ai_enabled, ai_assistant, updated_at, created_by")
      .in("id", ids)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Enrich DMs with the other user's display name
    const dmIds = (rooms ?? []).filter((r) => r.kind === "dm").map((r) => r.id);
    const otherMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
    if (dmIds.length) {
      const { data: allMembers } = await context.supabase
        .from("chat_members")
        .select("room_id, user_id")
        .in("room_id", dmIds);
      const otherIds = new Set<string>();
      for (const m of allMembers ?? []) {
        if ((m as { user_id: string }).user_id !== context.userId)
          otherIds.add((m as { user_id: string }).user_id);
      }
      if (otherIds.size) {
        const { data: profs } = await context.supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", Array.from(otherIds));
        const byId = new Map(
          (profs ?? []).map((p) => [
            (p as { id: string }).id,
            p as unknown as {
              id: string;
              display_name: string | null;
              username: string | null;
              avatar_url: string | null;
            },
          ]),
        );
        for (const m of allMembers ?? []) {
          const mm = m as { room_id: string; user_id: string };
          if (mm.user_id === context.userId) continue;
          const p = byId.get(mm.user_id);
          if (p)
            otherMap.set(mm.room_id, {
              display_name: p.display_name,
              username: p.username,
              avatar_url: p.avatar_url,
            });
        }
      }
    }
    return {
      rooms: (rooms ?? []).map((r) => ({
        ...r,
        peer: r.kind === "dm" ? otherMap.get(r.id) ?? null : null,
      })),
    };
  });

export const createDm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ peer_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.peer_id === context.userId) throw new Error("No puedes chatear contigo mismo");
    // Try to find existing DM between the two
    const { data: mine } = await context.supabase
      .from("chat_members")
      .select("room_id")
      .eq("user_id", context.userId);
    const mineIds = new Set((mine ?? []).map((m) => (m as { room_id: string }).room_id));
    if (mineIds.size) {
      const { data: peer } = await context.supabase
        .from("chat_members")
        .select("room_id")
        .eq("user_id", data.peer_id)
        .in("room_id", Array.from(mineIds));
      const shared = (peer ?? []).map((r) => (r as { room_id: string }).room_id);
      if (shared.length) {
        const { data: dm } = await context.supabase
          .from("chat_rooms")
          .select("id")
          .eq("kind", "dm")
          .in("id", shared)
          .maybeSingle();
        if (dm) return { room_id: (dm as { id: string }).id, existed: true };
      }
    }
    const { data: room, error } = await context.supabase
      .from("chat_rooms")
      .insert({ kind: "dm", created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const rid = (room as { id: string }).id;
    const { error: mErr } = await context.supabase.from("chat_members").insert([
      { room_id: rid, user_id: context.userId, role: "owner" },
      { room_id: rid, user_id: data.peer_id, role: "member" },
    ] as never);
    if (mErr) throw new Error(mErr.message);
    return { room_id: rid, existed: false };
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        peers: z.array(z.string().uuid()).min(1).max(30),
        ai_enabled: z.boolean().default(false),
        ai_assistant: z.enum(["nova", "nevira"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: room, error } = await context.supabase
      .from("chat_rooms")
      .insert({
        kind: "group",
        name: data.name,
        created_by: context.userId,
        ai_enabled: data.ai_enabled,
        ai_assistant: data.ai_assistant ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const rid = (room as { id: string }).id;
    const uniq = Array.from(new Set([context.userId, ...data.peers]));
    const rows = uniq.map((uid) => ({
      room_id: rid,
      user_id: uid,
      role: uid === context.userId ? "owner" : "member",
    }));
    const { error: mErr } = await context.supabase.from("chat_members").insert(rows as never);
    if (mErr) throw new Error(mErr.message);
    return { room_id: rid };
  });

export const getRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ room_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room, error } = await context.supabase
      .from("chat_rooms")
      .select("id, kind, name, avatar_url, ai_enabled, ai_assistant, created_by")
      .eq("id", data.room_id)
      .single();
    if (error || !room) throw new Error("Sala no encontrada");
    const { data: members } = await context.supabase
      .from("chat_members")
      .select("user_id, role, joined_at")
      .eq("room_id", data.room_id);
    const uids = (members ?? []).map((m) => (m as { user_id: string }).user_id);
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", uids);
    return { room, members: members ?? [], profiles: profs ?? [] };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ room_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("chat_room_messages")
      .select("id, room_id, sender_id, sender_kind, ai_name, body, attachments, created_at")
      .eq("room_id", data.room_id)
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        room_id: z.string().uuid(),
        body: z.string().min(1).max(4000),
        attachments: z
          .array(z.object({ name: z.string(), url: z.string().url(), mime: z.string() }))
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_room_messages").insert({
      room_id: data.room_id,
      sender_id: context.userId,
      sender_kind: "user",
      body: data.body,
      attachments: data.attachments as unknown as never,
    } as never);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.room_id);

    // If AI is enabled and this message mentions @nova or @nevira, or the message ends with a "?", queue AI reply
    const body = data.body.toLowerCase();
    const { data: room } = await context.supabase
      .from("chat_rooms")
      .select("ai_enabled, ai_assistant")
      .eq("id", data.room_id)
      .single();
    const r = room as { ai_enabled?: boolean; ai_assistant?: "nova" | "nevira" | null } | null;
    if (r?.ai_enabled && r.ai_assistant) {
      const tagged =
        body.includes(`@${r.ai_assistant}`) || body.includes("@nova") || body.includes("@nevira");
      if (tagged) {
        await invokeAiInternal(context.supabase, data.room_id, r.ai_assistant);
      }
    }
    return { ok: true };
  });

export const invokeAiInRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ room_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room, error } = await context.supabase
      .from("chat_rooms")
      .select("ai_enabled, ai_assistant")
      .eq("id", data.room_id)
      .single();
    if (error || !room) throw new Error("Sala no encontrada");
    const r = room as { ai_enabled: boolean; ai_assistant: "nova" | "nevira" | null };
    if (!r.ai_enabled || !r.ai_assistant) throw new Error("Esta sala no tiene IA activa");
    await invokeAiInternal(context.supabase, data.room_id, r.ai_assistant);
    return { ok: true };
  });

export const toggleAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        room_id: z.string().uuid(),
        enabled: z.boolean(),
        assistant: z.enum(["nova", "nevira"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { ai_enabled: data.enabled };
    if (data.enabled && data.assistant) patch.ai_assistant = data.assistant;
    const { error } = await context.supabase
      .from("chat_rooms")
      .update(patch as never)
      .eq("id", data.room_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ room_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_members")
      .delete()
      .eq("room_id", data.room_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* internal AI reply helper */
async function invokeAiInternal(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  roomId: string,
  assistant: "nova" | "nevira",
) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY no configurado");
  const { data: msgs } = await supabase
    .from("chat_room_messages")
    .select("sender_kind, ai_name, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(30);
  const transcript = ((msgs ?? []) as Array<{ sender_kind: string; ai_name: string | null; body: string }>)
    .map((m) =>
      m.sender_kind === "ai"
        ? `[${m.ai_name ?? assistant.toUpperCase()}]: ${m.body}`
        : `[Usuario]: ${m.body}`,
    )
    .join("\n");
  const persona =
    assistant === "nova"
      ? "Eres NOVA en una sala de comunicación interna. Responde con calidez y creatividad, breve (2-4 frases)."
      : "Eres NEVIRA en una sala de comunicación interna. Responde con precisión y estructura, breve (bullets si aplica).";
  const gateway = createLovableAiGatewayProvider(apiKey);
  const result = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: persona,
    prompt: `Transcripción reciente:\n${transcript}\n\nRedacta tu siguiente turno como ${assistant.toUpperCase()}. Si nadie te pregunta directamente, aporta un insight breve.`,
  });
  await supabase.from("chat_room_messages").insert({
    room_id: roomId,
    sender_id: null,
    sender_kind: "ai",
    ai_name: assistant.toUpperCase(),
    body: result.text,
  } as never);
  await supabase
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", roomId);
}
