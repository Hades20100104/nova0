import { supabase } from "@/integrations/supabase/client";

export type TriggerType = "geofence_enter" | "geofence_exit" | "time";
export type ActionType = "whatsapp" | "spotify" | "notification";

export interface GeofenceConfig {
  label: string;
  lat: number;
  lng: number;
  radiusM: number;
}
export interface TimeConfig {
  /** "HH:MM" 24h */
  time: string;
  /** Días de semana 0=domingo..6=sábado */
  days: number[];
}
export interface WhatsAppActionConfig {
  to: string; // teléfono
  contactName?: string;
  message: string;
}
export interface SpotifyActionConfig {
  query: string; // "playlist X", "artista Y", "canción Z"
}
export interface NotificationActionConfig {
  text: string;
}

export interface Automation {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  trigger_type: TriggerType;
  trigger_config: GeofenceConfig | TimeConfig;
  action_type: ActionType;
  action_config: WhatsAppActionConfig | SpotifyActionConfig | NotificationActionConfig;
  last_triggered_at: string | null;
  last_state: string | null;
}

export async function fetchAutomations(userId: string): Promise<Automation[]> {
  const { data, error } = await supabase
    .from("automations" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAutomations", error);
    return [];
  }
  return (data ?? []) as unknown as Automation[];
}

export async function createAutomation(
  userId: string,
  payload: Omit<Automation, "id" | "user_id" | "last_triggered_at" | "last_state">,
): Promise<Automation> {
  const { data, error } = await supabase
    .from("automations" as any)
    .insert({ user_id: userId, ...payload } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Automation;
}

export async function updateAutomation(id: string, patch: Partial<Automation>) {
  const { error } = await supabase.from("automations" as any).update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteAutomation(id: string) {
  const { error } = await supabase.from("automations" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function markTriggered(id: string, state?: string) {
  await updateAutomation(id, {
    last_triggered_at: new Date().toISOString() as any,
    last_state: state ?? null,
  });
}

/** Distancia en metros entre dos coordenadas (Haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
