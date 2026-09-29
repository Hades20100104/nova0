import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MERLIN_SEED } from "@/lib/merlin/mock";
import type {
  Decision,
  Evidence,
  LearningRoute,
  MemoryEntry,
  MerlinDataset,
  PersonalConcept,
  Relationship,
  Strategy,
} from "@/lib/merlin/types";

type Db = { from: (t: string) => any };

/** Crea los datos iniciales del alumno la primera vez que entra a Merlin. */
async function seed(supabase: Db, userId: string) {
  const s = MERLIN_SEED;

  const { data: subject, error: subjectError } = await supabase
    .from("merlin_subjects")
    .insert({ user_id: userId, name: s.subject.name, curriculum: s.subject.curriculum, level: s.user.level })
    .select("id")
    .single();
  if (subjectError) throw subjectError;
  const subjectId = subject.id as string;

  await supabase.from("merlin_strategies").insert(
    s.strategies.map((st) => ({
      user_id: userId,
      slug: st.id,
      concept_kind: st.context,
      strategy: st.type,
      result: st.result,
      context: st.context,
      effectiveness: st.effectiveness,
      confidence: st.effectiveness,
    })),
  );

  const { data: conceptRows, error: conceptError } = await supabase
    .from("merlin_concepts")
    .insert(
      s.concepts.map((c) => {
        const p = s.personal.find((x) => x.conceptId === c.id);
        return {
          user_id: userId,
          subject_id: subjectId,
          slug: c.id,
          name: c.name,
          area: c.curriculumUnit,
          curriculum_unit: c.curriculumUnit,
          difficulty: c.difficulty,
          weight: c.weight,
          prerequisites: c.prerequisites,
          strategy_key: p?.strategyId ?? null,
          breakdown: p?.breakdown ?? [],
          status: p?.status ?? "no_iniciado",
          mastery: p?.mastery ?? {},
          overall: p?.overall ?? 0,
          confidence: p?.confidence ?? 0,
          priority: p?.priority ?? "baja",
          position: { x: p?.x ?? 50, y: p?.y ?? 50 },
        };
      }),
    )
    .select("id, slug");
  if (conceptError) throw conceptError;

  const idOf = new Map<string, string>((conceptRows as any[]).map((r) => [r.slug, r.id]));

  await supabase.from("merlin_relations").insert(
    s.relationships.map((r) => ({
      user_id: userId,
      subject_id: subjectId,
      from_concept: idOf.get(r.from),
      to_concept: idOf.get(r.to),
      kind: r.kind,
    })),
  );

  await supabase.from("merlin_evidence").insert(
    s.evidence.map((e) => ({
      user_id: userId,
      subject_id: subjectId,
      concept_id: idOf.get(e.conceptId),
      agent: "merlin",
      kind: e.type,
      result: e.result,
      summary: e.context,
      context: e.context,
      confidence: e.confidence,
      importance: "media",
      correct: e.result === "correcto",
      created_at: new Date(e.date).toISOString(),
    })),
  );

  await supabase.from("merlin_routes").insert({
    user_id: userId,
    subject_id: subjectId,
    steps: s.route.steps,
    reason: s.route.reason,
    confidence: s.route.confidence,
    priority: s.route.priority,
    active: true,
  });

  await supabase.from("merlin_memory").insert(
    s.memory.map((m) => ({
      user_id: userId,
      subject_id: subjectId,
      type: m.type,
      content: m.content,
      confidence: m.confidence,
      importance: m.importance,
    })),
  );

  await supabase.from("merlin_decisions").insert(
    s.decisions.map((d) => ({
      user_id: userId,
      subject_id: subjectId,
      title: d.title,
      motive: d.motive,
      evidence: d.evidence,
      confidence: d.confidence,
      action: d.action,
      expected: d.expected,
      outcome: d.outcome,
    })),
  );

  return subjectId;
}

async function loadDataset(supabase: Db, userId: string, subjectRow: any): Promise<MerlinDataset> {
  const subjectId = subjectRow.id as string;

  const [{ data: concepts }, { data: relations }, { data: evidence }, { data: strategies }, { data: routes }, { data: memory }, { data: decisions }] =
    await Promise.all([
      supabase.from("merlin_concepts").select("*").eq("subject_id", subjectId),
      supabase.from("merlin_relations").select("*").eq("subject_id", subjectId),
      supabase.from("merlin_evidence").select("*").eq("subject_id", subjectId).order("created_at", { ascending: true }),
      supabase.from("merlin_strategies").select("*").eq("user_id", userId),
      supabase.from("merlin_routes").select("*").eq("subject_id", subjectId).eq("active", true).order("created_at", { ascending: false }).limit(1),
      supabase.from("merlin_memory").select("*").eq("subject_id", subjectId).neq("status", "descartada"),
      supabase.from("merlin_decisions").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false }),
    ]);

  const rows = (concepts ?? []) as any[];
  const slugOf = new Map<string, string>(rows.map((r) => [r.id, r.slug ?? r.id]));

  const conceptList = rows.map((r) => ({
    id: r.slug ?? r.id,
    subjectId,
    name: r.name,
    curriculumUnit: r.curriculum_unit ?? r.area ?? "",
    prerequisites: (r.prerequisites ?? []) as string[],
    difficulty: r.difficulty ?? 1,
    weight: r.weight ?? 3,
  }));

  const evidenceList: Evidence[] = ((evidence ?? []) as any[]).map((e) => ({
    id: e.id,
    conceptId: slugOf.get(e.concept_id) ?? "",
    type: e.kind,
    result: e.result ?? (e.correct ? "correcto" : "parcial"),
    date: String(e.created_at).slice(0, 10),
    context: e.context ?? e.summary,
    confidence: Number(e.confidence ?? 0),
  }));

  const personal: PersonalConcept[] = rows.map((r) => {
    const slug = r.slug ?? r.id;
    return {
      conceptId: slug,
      mastery: r.mastery ?? { comprension: 0, aplicacion: 0, transferencia: 0, retencion: 0, teoria: 0, practica: 0 },
      overall: Math.round(Number(r.overall ?? 0)),
      confidence: Math.round(Number(r.confidence ?? 0)),
      priority: r.priority,
      status: r.status,
      strategyId: r.strategy_key ?? "",
      evidenceIds: evidenceList.filter((e) => e.conceptId === slug).map((e) => e.id),
      breakdown: (r.breakdown ?? []).length ? r.breakdown : undefined,
      x: r.position?.x ?? 50,
      y: r.position?.y ?? 50,
    };
  });

  const relationships: Relationship[] = ((relations ?? []) as any[]).map((r) => ({
    from: slugOf.get(r.from_concept) ?? "",
    to: slugOf.get(r.to_concept) ?? "",
    kind: r.kind,
  }));

  const strategyList: Strategy[] = ((strategies ?? []) as any[]).map((st) => ({
    id: st.slug ?? st.id,
    type: st.strategy,
    result: st.result ?? "activa",
    context: st.context ?? st.concept_kind,
    effectiveness: Math.round(Number(st.effectiveness ?? st.confidence ?? 0)),
  }));

  const routeRow = ((routes ?? []) as any[])[0];
  const route: LearningRoute = {
    id: routeRow?.id ?? "route",
    subjectId,
    steps: (routeRow?.steps ?? []) as LearningRoute["steps"],
    priority: routeRow?.priority ?? "media",
    reason: routeRow?.reason ?? "",
    confidence: Math.round(Number(routeRow?.confidence ?? 0)),
    createdAt: routeRow?.created_at ?? new Date().toISOString(),
  };

  const memoryList: MemoryEntry[] = ((memory ?? []) as any[]).map((m) => ({
    id: m.id,
    type: m.type,
    content: m.content,
    confidence: Math.round(Number(m.confidence ?? 0)),
    importance: m.importance,
    lastUpdated: String(m.updated_at ?? m.created_at).slice(0, 10),
  }));

  const decisionList: Decision[] = ((decisions ?? []) as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    motive: d.motive,
    evidence: d.evidence,
    confidence: Math.round(Number(d.confidence ?? 0)),
    action: d.action,
    expected: d.expected,
    date: String(d.created_at).slice(0, 10),
    outcome: d.outcome,
  }));

  return {
    user: { id: userId, name: subjectRow.level ? "Alumno" : "Alumno", level: subjectRow.level ?? "", goals: MERLIN_SEED.user.goals },
    subject: { id: subjectId, name: subjectRow.name, curriculum: subjectRow.curriculum ?? "" },
    concepts: conceptList,
    relationships,
    personal,
    evidence: evidenceList,
    strategies: strategyList,
    route,
    memory: memoryList,
    decisions: decisionList,
  };
}

/** Devuelve el dataset real del alumno, sembrándolo la primera vez. */
export const getMerlinData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as unknown as Db;
    const userId = context.userId as string;

    const { data: subjects } = await supabase
      .from("merlin_subjects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    let subjectRow = ((subjects ?? []) as any[])[0];
    if (!subjectRow) {
      const id = await seed(supabase, userId);
      const { data } = await supabase.from("merlin_subjects").select("*").eq("id", id).single();
      subjectRow = data;
    }

    return loadDataset(supabase, userId, subjectRow);
  });

/** Guarda la evidencia que produce un ejercicio del Modo Aprender. */
export const recordMerlinEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conceptSlug: z.string(),
        result: z.enum(["correcto", "parcial", "incorrecto"]),
        context: z.string(),
        type: z.enum(["ejercicio", "explicacion", "examen", "proyecto", "recuerdo", "observacion"]).default("ejercicio"),
        confidence: z.number().min(0).max(100).default(75),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as unknown as Db;
    const userId = context.userId as string;

    const { data: concept } = await supabase
      .from("merlin_concepts")
      .select("id, subject_id")
      .eq("user_id", userId)
      .eq("slug", data.conceptSlug)
      .limit(1)
      .maybeSingle();
    if (!concept) return { ok: false };

    const { error } = await supabase.from("merlin_evidence").insert({
      user_id: userId,
      subject_id: concept.subject_id,
      concept_id: concept.id,
      agent: "merlin",
      kind: data.type,
      result: data.result,
      summary: data.context,
      context: data.context,
      confidence: data.confidence,
      importance: "media",
      correct: data.result === "correcto",
    });
    if (error) throw error;
    return { ok: true };
  });

/** Marca un paso de la ruta como hecho o pendiente. */
export const setMerlinRouteStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ stepId: z.string(), done: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as unknown as Db;
    const userId = context.userId as string;

    const { data: routes } = await supabase
      .from("merlin_routes")
      .select("id, steps")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    const route = ((routes ?? []) as any[])[0];
    if (!route) return { ok: false };

    const steps = (route.steps as any[]).map((s) => (s.id === data.stepId ? { ...s, done: data.done } : s));
    const { error } = await supabase.from("merlin_routes").update({ steps }).eq("id", route.id);
    if (error) throw error;
    return { ok: true };
  });

/** Confirma o descarta una entrada de la memoria de aprendizaje. */
export const setMerlinMemoryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string(), status: z.enum(["activa", "confirmada", "descartada"]) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as unknown as Db;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "confirmada") patch.confidence = 95;
    const { error } = await supabase
      .from("merlin_memory")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId as string);
    if (error) throw error;
    return { ok: true };
  });
