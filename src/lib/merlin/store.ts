import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMerlinData } from "@/lib/merlin.functions";
import { MERLIN_DATA, hydrateMerlinData, subscribeMerlinData } from "./mock";
import type { MerlinDataset } from "./types";

let version = 0;
const bump = () => {
  version += 1;
};
subscribeMerlinData(bump);

const getSnapshot = () => version;

/**
 * Carga el dataset real del alumno y lo publica en el store compartido,
 * de modo que mapa, ruta, memoria y análisis dejen de usar la semilla.
 */
export function useMerlinData() {
  const fetchData = useServerFn(getMerlinData);
  const query = useQuery({
    queryKey: ["merlin", "dataset"],
    queryFn: () => fetchData() as Promise<MerlinDataset>,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) hydrateMerlinData(query.data);
  }, [query.data]);

  useSyncExternalStore(
    (cb) => subscribeMerlinData(cb),
    getSnapshot,
    getSnapshot,
  );

  return { data: MERLIN_DATA, loading: query.isLoading, error: query.error, refetch: query.refetch };
}
