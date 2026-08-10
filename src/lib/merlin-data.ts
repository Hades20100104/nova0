import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMerlinAccess, unlockMerlin, listSubjects, createSubject, deleteSubject,
  getSubjectMap, getConceptDetail, merlinOverview, listDocuments, addDocument,
  planRoute, answerRecall, upsertGoal,
} from "./merlin.functions";

export function useMerlinAccess() {
  const fn = useServerFn(getMerlinAccess);
  return useQuery({
    queryKey: ["merlin", "access"],
    queryFn: () => fn(),
    staleTime: 60_000,
    retry: false,
  });
}

export function useUnlockMerlin() {
  const fn = useServerFn(unlockMerlin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => fn({ data: { password } }),
    onSuccess: (r) => {
      if (r.ok) {
        try {
          localStorage.setItem("merlin-unlocked", "1");
        } catch {
          /* ignore */
        }
        qc.invalidateQueries({ queryKey: ["merlin"] });
      }
    },
  });
}

export function useSubjects() {
  const fn = useServerFn(listSubjects);
  return useQuery({ queryKey: ["merlin", "subjects"], queryFn: () => fn(), retry: false });
}

export function useSubjectMutations() {
  const create = useServerFn(createSubject);
  const remove = useServerFn(deleteSubject);
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["merlin"] });
  return {
    create: useMutation({
      mutationFn: (v: { name: string; level?: string; curriculum?: string; family?: string }) =>
        create({ data: v }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: inv }),
  };
}

export function useSubjectMap(subjectId?: string) {
  const fn = useServerFn(getSubjectMap);
  return useQuery({
    queryKey: ["merlin", "map", subjectId],
    queryFn: () => fn({ data: { subjectId: subjectId! } }),
    enabled: !!subjectId,
    retry: false,
  });
}

export function useConcept(conceptId?: string) {
  const fn = useServerFn(getConceptDetail);
  return useQuery({
    queryKey: ["merlin", "concept", conceptId],
    queryFn: () => fn({ data: { conceptId: conceptId! } }),
    enabled: !!conceptId,
    retry: false,
  });
}

export function useMerlinOverview() {
  const fn = useServerFn(merlinOverview);
  return useQuery({ queryKey: ["merlin", "overview"], queryFn: () => fn(), retry: false });
}

export function useMerlinDocuments() {
  const fn = useServerFn(listDocuments);
  return useQuery({ queryKey: ["merlin", "docs"], queryFn: () => fn(), retry: false });
}

export function useDocMutations() {
  const add = useServerFn(addDocument);
  const qc = useQueryClient();
  return {
    add: useMutation({
      mutationFn: (v: { title: string; content: string; kind?: string; subjectId?: string }) =>
        add({ data: v }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["merlin", "docs"] }),
    }),
  };
}

export function useRouteMutations() {
  const plan = useServerFn(planRoute);
  const qc = useQueryClient();
  return {
    plan: useMutation({
      mutationFn: (v: { subjectId: string; goal?: string }) => plan({ data: v }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["merlin"] }),
    }),
  };
}

export function useMerlinTracking() {
  const recall = useServerFn(answerRecall);
  const goal = useServerFn(upsertGoal);
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["merlin", "overview"] });
  return {
    answerRecall: useMutation({
      mutationFn: (v: { id: string; result: "ok" | "fallo" }) => recall({ data: v }),
      onSuccess: inv,
    }),
    saveGoal: useMutation({
      mutationFn: (v: { id?: string; title: string; kind?: string; target_date?: string; progress?: number; status?: string }) =>
        goal({ data: v }),
      onSuccess: inv,
    }),
  };
}
