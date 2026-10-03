import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ActivityKind =
  | "message"
  | "image"
  | "document"
  | "task"
  | "automation"
  | "memory"
  | "project"
  | "ai";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  label: string;
  detail: string;
  at: string;
};

const PER_SOURCE = 8;

function textOf(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  for (const p of parts as Array<{ type?: string; text?: string }>) {
    if (p?.type === "text" && p.text) return p.text;
  }
  return "";
}

/** Collects the signed-in user's latest records across sources, merged newest-first. */
export function useRecentActivity(limit = 6) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-activity", user?.id ?? "anon", limit],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<ActivityItem[]> => {
      const [msgs, imgs, docs, tasks, autos, mems, projs, events] = await Promise.all([
        supabase
          .from("assistant_messages")
          .select("id, role, parts, created_at, assistant_threads!inner(title, assistant)")
          .order("created_at", { ascending: false })
          .limit(PER_SOURCE),
        supabase.from("generated_images").select("id, prompt, created_at").order("created_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("generated_documents").select("id, title, format, created_at").order("created_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("tasks").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("automations").select("id, name, updated_at, last_triggered_at").order("updated_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("user_memory").select("id, key, value, updated_at").order("updated_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("projects").select("id, name, status, updated_at").order("updated_at", { ascending: false }).limit(PER_SOURCE),
        supabase.from("section_events").select("id, kind, payload, created_at").order("created_at", { ascending: false }).limit(PER_SOURCE),
      ]);
      const firstError = [msgs, imgs, docs, tasks, autos, mems, projs, events].find((r) => r.error);
      if (firstError?.error) throw new Error(firstError.error.message);

      const items: ActivityItem[] = [];
      for (const m of msgs.data ?? []) {
        const th = m.assistant_threads as unknown as { title: string; assistant: string } | null;
        const who = (th?.assistant ?? "nova").toUpperCase();
        items.push({
          id: `msg-${m.id}`,
          kind: m.role === "assistant" ? "ai" : "message",
          label: m.role === "assistant" ? `Respuesta de ${who}` : `Mensaje a ${who}`,
          detail: textOf(m.parts) || th?.title || "Conversación",
          at: m.created_at,
        });
      }
      for (const i of imgs.data ?? []) items.push({ id: `img-${i.id}`, kind: "image", label: "Imagen creada", detail: i.prompt, at: i.created_at });
      for (const d of docs.data ?? []) items.push({ id: `doc-${d.id}`, kind: "document", label: `Documento ${d.format.toUpperCase()}`, detail: d.title, at: d.created_at });
      for (const t of tasks.data ?? [])
        items.push({ id: `task-${t.id}`, kind: "task", label: t.status === "done" ? "Tarea completada" : "Tarea actualizada", detail: t.title, at: t.updated_at });
      for (const a of autos.data ?? []) {
        const ran = a.last_triggered_at && a.last_triggered_at > a.updated_at;
        items.push({ id: `auto-${a.id}`, kind: "automation", label: ran ? "Automatización ejecutada" : "Automatización editada", detail: a.name, at: ran ? a.last_triggered_at! : a.updated_at });
      }
      for (const m of mems.data ?? []) items.push({ id: `mem-${m.id}`, kind: "memory", label: "Memoria guardada", detail: `${m.key}: ${m.value}`, at: m.updated_at });
      for (const p of projs.data ?? []) items.push({ id: `proj-${p.id}`, kind: "project", label: "Proyecto actualizado", detail: p.name, at: p.updated_at });
      for (const e of events.data ?? []) {
        const payload = (e.payload ?? {}) as Record<string, unknown>;
        const detail = String(payload.label ?? payload.name ?? payload.title ?? e.kind);
        items.push({ id: `evt-${e.id}`, kind: "ai", label: "Acción de IA", detail, at: e.created_at });
      }

      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },
  });
}

export function relativeTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Ahora";
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  return `Hace ${Math.floor(s / 86400)} d`;
}
