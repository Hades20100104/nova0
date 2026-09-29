import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  resolveSectionSource,
} from "@/lib/sections.functions";

export function useUserSections(assistant?: "nova" | "nevira") {
  const fn = useServerFn(listSections);
  return useQuery({
    queryKey: ["user_sections", assistant ?? "all"],
    queryFn: async () => {
      const { sections } = await fn({});
      return assistant ? sections.filter((s) => s.assistant === assistant) : sections;
    },
    staleTime: 30_000,
  });
}

export function useSectionMutations() {
  const qc = useQueryClient();
  const create = useServerFn(createSection);
  const update = useServerFn(updateSection);
  const remove = useServerFn(deleteSection);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["user_sections"] });
  return {
    create: useMutation({
      mutationFn: (data: unknown) => create({ data: data as never }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (data: unknown) => update({ data: data as never }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (data: { slug: string }) => remove({ data }),
      onSuccess: invalidate,
    }),
  };
}

export function useSectionSource(source: string, opts: { limit?: number; range?: number } = {}) {
  const fn = useServerFn(resolveSectionSource);
  return useQuery({
    queryKey: ["section_source", source, opts.limit ?? null, opts.range ?? null],
    queryFn: () => fn({ data: { source: source as never, ...opts } }),
    staleTime: 60_000,
  });
}
