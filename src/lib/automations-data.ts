import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAutomations,
  upsertAutomation,
  setAutomationEnabled,
  deleteAutomation,
  runAutomation,
  type Automation,
  type Step,
  type Trigger,
} from "@/lib/automations.functions";

export type { Automation, Step, Trigger };

export function useAutomations() {
  const fn = useServerFn(listAutomations);
  return useQuery({
    queryKey: ["automations"],
    queryFn: async () => (await fn()).automations,
    staleTime: 15_000,
  });
}

export function useAutomationMutations() {
  const qc = useQueryClient();
  const save = useServerFn(upsertAutomation);
  const toggle = useServerFn(setAutomationEnabled);
  const remove = useServerFn(deleteAutomation);
  const run = useServerFn(runAutomation);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["automations"] });

  return {
    save: useMutation({
      mutationFn: (input: { id?: string; name: string; enabled: boolean; trigger: Trigger; steps: Step[] }) =>
        save({ data: input }),
      onSuccess: invalidate,
    }),
    toggle: useMutation({
      mutationFn: (input: { id: string; enabled: boolean }) => toggle({ data: input }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => remove({ data: { id } }),
      onSuccess: invalidate,
    }),
    run: useMutation({
      mutationFn: (id: string) => run({ data: { id } }),
      onSuccess: invalidate,
    }),
  };
}
