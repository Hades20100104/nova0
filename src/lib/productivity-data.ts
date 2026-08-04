import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "todo" | "doing" | "done";
  priority: number;
  impact: number;
  effort: number;
  start_date: string | null;
  due_date: string | null;
  estimate_minutes: number | null;
  project_id: string | null;
  completed_at: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  horizon: string;
  target_date: string | null;
  progress: number;
  status: string;
};

export type Habit = { id: string; name: string; target_per_week: number; archived: boolean };
export type HabitLog = { id: string; habit_id: string; done_on: string };
export type Insight = {
  id: string;
  kind: string;
  content: string;
  evidence: string | null;
  confidence: number;
  created_at: string;
};

const key = (name: string, uid?: string) => [name, uid ?? "anon"];

export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: key("projects", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, color, status, start_date, due_date")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Project[];
    },
  });
}

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: key("tasks", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, notes, status, priority, impact, effort, start_date, due_date, estimate_minutes, project_id, completed_at",
        )
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as Task[];
    },
  });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: key("tasks", user?.id) });

  const create = useMutation({
    mutationFn: async (input: { title: string; project_id?: string | null; due_date?: string | null }) => {
      if (!user) throw new Error("Sin sesión");
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: input.title,
        project_id: input.project_id ?? null,
        due_date: input.due_date ?? null,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: Task["status"] }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: input.status,
          completed_at: input.status === "done" ? new Date().toISOString() : null,
        } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { create, setStatus, remove };
}

export function useGoals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: key("goals", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, description, horizon, target_date, progress, status")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Goal[];
    },
  });
  const setProgress = useMutation({
    mutationFn: async (input: { id: string; progress: number }) => {
      const { error } = await supabase
        .from("goals")
        .update({ progress: input.progress } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("goals", user?.id) }),
  });
  const create = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Sin sesión");
      const { error } = await supabase.from("goals").insert({ user_id: user.id, title } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("goals", user?.id) }),
  });
  return { ...query, setProgress, create };
}

export function useHabits() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const since = new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: key("habits", user?.id),
    enabled: !!user,
    queryFn: async () => {
      const [{ data: habits, error }, { data: logs }] = await Promise.all([
        supabase.from("habits").select("id, name, target_per_week, archived").eq("archived", false),
        supabase.from("habit_logs").select("id, habit_id, done_on").gte("done_on", since),
      ]);
      if (error) throw new Error(error.message);
      return {
        habits: (habits ?? []) as Habit[],
        logs: (logs ?? []) as HabitLog[],
      };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key("habits", user?.id) });

  const create = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Sin sesión");
      const { error } = await supabase.from("habits").insert({ user_id: user.id, name } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const toggleToday = useMutation({
    mutationFn: async (input: { habit_id: string; done: boolean }) => {
      if (!user) throw new Error("Sin sesión");
      const day = new Date().toISOString().slice(0, 10);
      if (input.done) {
        const { error } = await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", input.habit_id)
          .eq("done_on", day);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("habit_logs")
          .insert({ user_id: user.id, habit_id: input.habit_id, done_on: day } as never);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  return { ...query, create, toggleToday };
}

export function useFocusSessions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const query = useQuery({
    queryKey: key("focus", user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("id, minutes, kind, created_at")
        .gte("created_at", since);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; minutes: number; kind: string; created_at: string }>;
    },
  });
  const log = useMutation({
    mutationFn: async (input: { minutes: number; kind: "focus" | "break"; label?: string }) => {
      if (!user) throw new Error("Sin sesión");
      const { error } = await supabase.from("focus_sessions").insert({
        user_id: user.id,
        minutes: input.minutes,
        kind: input.kind,
        label: input.label ?? null,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("focus", user?.id) }),
  });
  return { ...query, log };
}

export function useInsights() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: key("insights", user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Insight[]> => {
      const { data, error } = await supabase
        .from("user_insights")
        .select("id, kind, content, evidence, confidence, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Insight[];
    },
  });
  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_insights")
        .update({ status: "dismissed" } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("insights", user?.id) }),
  });
  return { ...query, dismiss };
}

/** Priorización automática: impacto/esfuerzo + urgencia. */
export function scoreTask(t: Task): number {
  const now = Date.now();
  const urgency = t.due_date
    ? Math.max(0, 10 - Math.floor((new Date(t.due_date).getTime() - now) / 86400000))
    : 0;
  return t.impact * 3 + (5 - t.priority) * 2 + urgency - t.effort;
}
