import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  reminder_minutes: number | null;
  recurrence: string;
  recurrence_until: string | null;
  status: string;
  source: string;
  task_id: string | null;
  google_event_id: string | null;
};

export type NewEvent = Partial<CalendarEvent> & { title: string; starts_at: string; ends_at: string };

const key = (uid?: string) => ["calendar_events", uid ?? "anon"];

export function useCalendarEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: key(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
  });
}

export function useEventMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: key(user?.id) });

  const create = useMutation({
    mutationFn: async (e: NewEvent) => {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...e, user_id: user!.id } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CalendarEvent> & { id: string }) => {
      const { error } = await supabase.from("calendar_events").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* ------------- recurrence expansion ------------- */
export type Occurrence = CalendarEvent & { occStart: Date; occEnd: Date };

export function expandOccurrences(events: CalendarEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    const s = new Date(e.starts_at);
    const en = new Date(e.ends_at);
    const dur = Math.max(en.getTime() - s.getTime(), 0);
    const until = e.recurrence_until ? new Date(`${e.recurrence_until}T23:59:59`) : to;
    const limit = until < to ? until : to;

    if (e.recurrence === "none" || !e.recurrence) {
      if (en >= from && s <= to) out.push({ ...e, occStart: s, occEnd: en });
      continue;
    }
    const step = (d: Date) => {
      const n = new Date(d);
      if (e.recurrence === "daily") n.setDate(n.getDate() + 1);
      else if (e.recurrence === "weekly") n.setDate(n.getDate() + 7);
      else if (e.recurrence === "monthly") n.setMonth(n.getMonth() + 1);
      else if (e.recurrence === "yearly") n.setFullYear(n.getFullYear() + 1);
      else n.setDate(n.getDate() + 3650);
      return n;
    };
    let cur = new Date(s);
    let guard = 0;
    while (cur <= limit && guard++ < 800) {
      const end = new Date(cur.getTime() + dur);
      if (end >= from) out.push({ ...e, occStart: new Date(cur), occEnd: end });
      cur = step(cur);
    }
  }
  return out.sort((a, b) => a.occStart.getTime() - b.occStart.getTime());
}

/* ------------- conflicts & availability ------------- */
export function findConflicts(occs: Occurrence[]): Array<[Occurrence, Occurrence]> {
  const pairs: Array<[Occurrence, Occurrence]> = [];
  for (let i = 0; i < occs.length; i++) {
    for (let j = i + 1; j < occs.length; j++) {
      const a = occs[i]!;
      const b = occs[j]!;
      if (b.occStart >= a.occEnd) break;
      if (a.occStart < b.occEnd && b.occStart < a.occEnd && !a.all_day && !b.all_day) pairs.push([a, b]);
    }
  }
  return pairs;
}

export function freeSlots(occs: Occurrence[], day: Date, startHour = 8, endHour = 21) {
  const dayStart = new Date(day);
  dayStart.setHours(startHour, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(endHour, 0, 0, 0);
  const busy = occs
    .filter((o) => o.occEnd > dayStart && o.occStart < dayEnd && !o.all_day)
    .sort((a, b) => a.occStart.getTime() - b.occStart.getTime());
  const slots: Array<{ start: Date; end: Date }> = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.occStart > cursor) slots.push({ start: new Date(cursor), end: new Date(b.occStart) });
    if (b.occEnd > cursor) cursor = b.occEnd;
  }
  if (cursor < dayEnd) slots.push({ start: new Date(cursor), end: new Date(dayEnd) });
  return slots.filter((s) => s.end.getTime() - s.start.getTime() >= 30 * 60 * 1000);
}

/* ------------- ICS (Google Calendar interop) ------------- */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

export function toICS(events: CalendarEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NOVA//Calendar//ES"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@nova`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(new Date(e.starts_at))}`,
      `DTEND:${icsDate(new Date(e.ends_at))}`,
      `SUMMARY:${(e.title || "").replace(/\n/g, " ")}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, "\\n")}`);
    if (e.location) lines.push(`LOCATION:${e.location}`);
    if (e.recurrence && e.recurrence !== "none")
      lines.push(`RRULE:FREQ=${e.recurrence.toUpperCase().replace("YEARLY", "YEARLY")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const parseIcsDate = (v: string) => {
  const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  const iso = `${y}-${mo}-${d}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:${s.padStart(2, "0")}${z ? "Z" : ""}`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};

export function parseICS(text: string): NewEvent[] {
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  const events: NewEvent[] = [];
  for (const b of blocks) {
    const get = (k: string) => b.match(new RegExp(`^${k}[^:\\r\\n]*:(.*)$`, "m"))?.[1]?.trim();
    const start = parseIcsDate(get("DTSTART") ?? "");
    const end = parseIcsDate(get("DTEND") ?? "") ?? (start ? new Date(start.getTime() + 3600000) : null);
    if (!start || !end) continue;
    const rrule = get("RRULE") ?? "";
    const freq = rrule.match(/FREQ=(\w+)/)?.[1]?.toLowerCase();
    events.push({
      title: get("SUMMARY") || "Evento importado",
      description: get("DESCRIPTION") ?? null,
      location: get("LOCATION") ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      recurrence: freq && ["daily", "weekly", "monthly", "yearly"].includes(freq) ? freq : "none",
      source: "google",
      google_event_id: get("UID") ?? null,
    });
  }
  return events;
}
