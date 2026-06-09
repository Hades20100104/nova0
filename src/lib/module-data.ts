import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const formatRelative = (d: string) => {
  const t = new Date(d).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(d).toLocaleDateString();
};

/* ---------------- THREADS (conversación) ---------------- */
export function useNovaThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-threads", "nova", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_threads")
        .select("id, title, module, updated_at")
        .eq("assistant", "nova")
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) throw new Error(error.message);
      return (data ?? []).map((t) => ({ ...t, relative: formatRelative(t.updated_at) }));
    },
  });
}

/* ---------------- IMAGES ---------------- */
export function useGeneratedImages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-images", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("id, prompt, public_url, storage_path, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      // refresh signed URLs in case they expired
      const rows = data ?? [];
      const signed = await Promise.all(
        rows.map(async (r) => {
          const { data: s } = await supabase.storage
            .from("generated-images")
            .createSignedUrl(r.storage_path, 60 * 60 * 24);
          return { ...r, url: s?.signedUrl ?? r.public_url, relative: formatRelative(r.created_at) };
        }),
      );
      return signed;
    },
  });
}

/* ---------------- DOCUMENTS ---------------- */
export function useGeneratedDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-docs", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("id, title, format, file_name, storage_path, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => ({ ...d, relative: formatRelative(d.created_at) }));
    },
  });
}

export async function downloadDocument(storagePath: string, fileName: string) {
  const { data, error } = await supabase.storage.from("generated-docs").download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "No se pudo descargar");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- MEMORY ---------------- */
export function useUserMemory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-memory", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_memory")
        .select("id, key, value, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []).map((m) => ({ ...m, relative: formatRelative(m.updated_at) }));
    },
  });
}

export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_memory").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["module-memory"] }),
  });
}

/* ---------------- WHATSAPP CONTACTS ---------------- */
export function useWhatsappContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-wa", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("id, name, phone, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAddContact() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; phone: string }) => {
      if (!user) throw new Error("Sin sesión");
      const phone = input.phone.replace(/[^\d]/g, "");
      if (phone.length < 8) throw new Error("Número inválido");
      const { error } = await supabase
        .from("whatsapp_contacts")
        .insert({ user_id: user.id, name: input.name.trim(), phone });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["module-wa"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["module-wa"] }),
  });
}
