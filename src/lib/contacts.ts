import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
}

/** Normaliza un número: quita todo lo que no sea dígito o el "+" inicial. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

export async function fetchContacts(userId: string): Promise<WhatsAppContact[]> {
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .select("id, name, phone")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchContacts", error);
    return [];
  }
  return data ?? [];
}

export async function addContact(userId: string, name: string, phone: string) {
  const cleanPhone = normalizePhone(phone);
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .insert({ user_id: userId, name: name.trim(), phone: cleanPhone })
    .select("id, name, phone")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", id);
  if (error) throw error;
}

/** Busca un contacto por nombre (case-insensitive, primer match parcial). */
export function findContactByName(contacts: WhatsAppContact[], name: string): WhatsAppContact | null {
  const n = name.toLowerCase().trim();
  if (!n) return null;
  // Match exacto primero
  const exact = contacts.find((c) => c.name.toLowerCase() === n);
  if (exact) return exact;
  // Empieza con
  const starts = contacts.find((c) => c.name.toLowerCase().startsWith(n));
  if (starts) return starts;
  // Contiene
  return contacts.find((c) => c.name.toLowerCase().includes(n)) ?? null;
}
