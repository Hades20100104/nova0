import { supabase } from "@/integrations/supabase/client";

export type NeviraColor = "aqua" | "emerald" | "coral" | "rose";
export type NovaColor = "violet" | "magenta" | "cyan" | "emerald" | "gold";

export interface CloudProfile {
  id: string;
  display_name: string | null;
  assistant_name: string | null;
  theme: "nevira" | "nova";
  nevira_color: NeviraColor;
  nova_color: NovaColor;
}

export async function fetchProfile(userId: string): Promise<CloudProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, assistant_name, theme, nevira_color, nova_color")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchProfile error", error);
    return null;
  }
  return data as CloudProfile | null;
}

export async function updateProfile(userId: string, patch: Partial<Omit<CloudProfile, "id">>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("updateProfile error", error);
}

export async function fetchNotes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_memory")
    .select("value")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("fetchNotes error", error);
    return [];
  }
  return (data ?? []).map((r) => r.value as string);
}

export async function addNote(userId: string, note: string) {
  // Usamos timestamp como key única
  const key = `note_${Date.now()}`;
  const { error } = await supabase
    .from("user_memory")
    .insert({ user_id: userId, key, value: note });
  if (error) console.error("addNote error", error);
}

export async function clearNotes(userId: string) {
  const { error } = await supabase
    .from("user_memory")
    .delete()
    .eq("user_id", userId)
    .like("key", "note_%");
  if (error) console.error("clearNotes error", error);
}
