import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import {
  MERLIN_PERSONA,
  MERLIN_AGENTS,
  CONFIDENCE_THRESHOLD,
  SUBJECT_DIMENSIONS,
  statusFromOverall,
  type Importance,
} from "./merlin";

const MODEL = "google/gemini-3-flash-preview";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Falta LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

async function ask(system: string, prompt: string) {
  const { text } = await generateText({
    model: gateway()(MODEL),
    system: `${MERLIN_PERSONA}\n\n${system}`,
    prompt,
  });
  return text;
}

async function askJson<T>(system: string, prompt: string, fallback: T): Promise<T> {
  const raw = await ask(
    `${system}\n\nDevuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.`,
    prompt,
  );
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = Math.min(
    ...[cleaned.indexOf("{"), cleaned.indexOf("[")].filter((i) => i >= 0).concat([0]),
  );
  try {
    return JSON.parse(cleaned.slice(start)) as T;
  } catch {
    return fallback;
  }
}

/* ─────────────── Acceso ─────────────── */

const MERLIN_DEFAULT_PASSWORD = "MERLIN-2026";

export const getMerlinAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("merlin_access")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { unlocked: !!data };
  });

export const unlockMerlin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { password: string }) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const expected = process.env.MERLIN_PASSWORD || MERLIN_DEFAULT_PASSWORD;
    const a = data.password.trim();
    if (a.length !== expected.length) return { ok: false as const };
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return { ok: false as const };
    await context.supabase
      .from("merlin_access")
      .upsert({ user_id: context.userId }, { onConflict: "user_id" });
    return { ok: true as const };
  });

async function assertAccess(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase.from("merlin_access").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Merlin bloqueado");
}

/* ─────────────── Materias y mapa ─────────────── */

export const listSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("merlin_subjects")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at");
    return { subjects: data ?? [] };
  });

type GenConcept = { name: string; area?: string; summary?: string };
type GenRelation = { from: string; to: string; kind?: string };

export const createSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(80),
        level: z.string().max(60).optional(),
        curriculum: z.string().max(200).optional(),
        family: z.string().max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);

    const { data: subject, error } = await context.supabase
      .from("merlin_subjects")
      .insert({
        user_id: context.userId,
        name: data.name,
        level: data.level ?? "general",
        curriculum: data.curriculum ?? "Currículo oficial general",
        color: data.family ?? "general",
      })
      .select()
      .single();
    if (error || !subject) throw new Error(error?.message ?? "No se pudo crear la materia");

    const gen = await askJson<{ concepts: GenConcept[]; relations: GenRelation[] }>(
      "Construyes mapas académicos especializados a partir del currículo oficial.",
      `Materia: ${data.name}. Nivel: ${data.level ?? "general"}. Currículo: ${data.curriculum ?? "oficial"}.
Genera entre 10 y 16 conceptos clave ordenados de fundamento a avanzado, con sus relaciones.
Formato: {"concepts":[{"name","area","summary"}],"relations":[{"from","to","kind"}]}
kind ∈ prerequisite | helps | used_in | related. "from" y "to" son nombres exactos de conceptos.`,
      { concepts: [], relations: [] },
    );

    const concepts = (gen.concepts ?? []).slice(0, 20);
    if (concepts.length) {
      const { data: inserted } = await context.supabase
        .from("merlin_concepts")
        .insert(
          concepts.map((c, i) => ({
            user_id: context.userId,
            subject_id: subject.id,
            name: c.name.slice(0, 90),
            area: c.area?.slice(0, 60) ?? data.name,
            summary: c.summary?.slice(0, 400) ?? null,
            position: { i },
          })),
        )
        .select("id, name");

      const byName = new Map((inserted ?? []).map((c) => [c.name.toLowerCase(), c.id]));
      const rels = (gen.relations ?? [])
        .map((r) => ({
          user_id: context.userId,
          subject_id: subject.id,
          from_concept: byName.get((r.from ?? "").toLowerCase()),
          to_concept: byName.get((r.to ?? "").toLowerCase()),
          kind: ["prerequisite", "helps", "used_in", "related"].includes(r.kind ?? "")
            ? r.kind!
            : "related",
        }))
        .filter((r) => r.from_concept && r.to_concept && r.from_concept !== r.to_concept);
      if (rels.length) await context.supabase.from("merlin_relations").insert(rels as never);
    }

    return { subject };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await context.supabase.from("merlin_subjects").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const getSubjectMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subjectId: string }) => d)
  .handler(async ({ context, data }) => {
    const [concepts, relations, route] = await Promise.all([
      context.supabase
        .from("merlin_concepts")
        .select("*")
        .eq("user_id", context.userId)
        .eq("subject_id", data.subjectId)
        .order("created_at"),
      context.supabase
        .from("merlin_relations")
        .select("*")
        .eq("user_id", context.userId)
        .eq("subject_id", data.subjectId),
      context.supabase
        .from("merlin_routes")
        .select("*")
        .eq("user_id", context.userId)
        .eq("subject_id", data.subjectId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    return {
      concepts: concepts.data ?? [],
      relations: relations.data ?? [],
      route: route.data?.[0] ?? null,
    };
  });

export const getConceptDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conceptId: string }) => d)
  .handler(async ({ context, data }) => {
    const [concept, evidence, relations] = await Promise.all([
      context.supabase.from("merlin_concepts").select("*").eq("id", data.conceptId).eq("user_id", context.userId).maybeSingle(),
      context.supabase
        .from("merlin_evidence")
        .select("*")
        .eq("concept_id", data.conceptId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(12),
      context.supabase
        .from("merlin_relations")
        .select("*")
        .eq("user_id", context.userId)
        .or(`from_concept.eq.${data.conceptId},to_concept.eq.${data.conceptId}`),
    ]);
    return { concept: concept.data, evidence: evidence.data ?? [], relations: relations.data ?? [] };
  });

/* ─────────────── Diagnóstico adaptativo ─────────────── */

type DiagQuestion = { concept: string; question: string; difficulty: number; expects: string };

export const diagnosticNext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        subjectId: z.string(),
        history: z
          .array(z.object({ question: z.string(), answer: z.string(), correct: z.boolean().optional(), concept: z.string().optional() }))
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: subject } = await context.supabase
      .from("merlin_subjects")
      .select("name, level")
      .eq("id", data.subjectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: concepts } = await context.supabase
      .from("merlin_concepts")
      .select("name, overall")
      .eq("subject_id", data.subjectId)
      .eq("user_id", context.userId);

    const done = data.history.length;
    if (done >= 8) return { done: true as const, question: null };

    const q = await askJson<DiagQuestion>(
      "Diseñas exámenes diagnósticos adaptativos: subes dificultad tras aciertos, investigas el prerrequisito tras un fallo y no repites lo ya demostrado.",
      `Materia: ${subject?.name ?? "general"} (${subject?.level ?? "general"}).
Conceptos del mapa: ${(concepts ?? []).map((c) => `${c.name}(${c.overall}%)`).join(", ") || "sin mapa"}.
Historial: ${JSON.stringify(data.history).slice(0, 2500)}.
Genera la SIGUIENTE pregunta (abierta y breve).
Formato: {"concept","question","difficulty":1-5,"expects":"qué debe contener una buena respuesta"}`,
      { concept: subject?.name ?? "general", question: "¿Qué sabes ya de esta materia?", difficulty: 1, expects: "" },
    );
    return { done: false as const, question: q };
  });

export const diagnosticFinish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        subjectId: z.string(),
        history: z.array(z.object({ question: z.string(), answer: z.string(), concept: z.string().optional() })),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concepts } = await context.supabase
      .from("merlin_concepts")
      .select("id, name")
      .eq("subject_id", data.subjectId)
      .eq("user_id", context.userId);

    const result = await askJson<{
      profile: { dimension: string; value: number }[];
      gaps: string[];
      confidence: number;
      note: string;
      concepts: { name: string; comprension: number; aplicacion: number; transferencia: number; retencion: number; confidence: number }[];
    }>(
      "Interpretas diagnósticos por habilidades, no por aciertos. Distingues fallo por concepto, procedimiento o prerrequisito.",
      `Conceptos: ${(concepts ?? []).map((c) => c.name).join(", ")}.
Respuestas: ${JSON.stringify(data.history).slice(0, 4000)}.
Formato: {"profile":[{"dimension","value"}],"gaps":[],"confidence":0-100,"note":"","concepts":[{"name","comprension","aplicacion","transferencia","retencion","confidence"}]}`,
      { profile: [], gaps: [], confidence: 40, note: "Evidencia insuficiente.", concepts: [] },
    );

    for (const c of result.concepts ?? []) {
      const match = (concepts ?? []).find((x) => x.name.toLowerCase() === (c.name ?? "").toLowerCase());
      if (!match) continue;
      const mastery = {
        comprension: c.comprension ?? 0,
        aplicacion: c.aplicacion ?? 0,
        transferencia: c.transferencia ?? 0,
        retencion: c.retencion ?? 0,
      };
      const vals = Object.values(mastery);
      const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      await context.supabase
        .from("merlin_concepts")
        .update({
          mastery,
          overall,
          confidence: c.confidence ?? 50,
          status: statusFromOverall(overall, true),
          last_review_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .eq("user_id", context.userId);
    }

    await context.supabase.from("merlin_evidence").insert({
      user_id: context.userId,
      subject_id: data.subjectId,
      agent: "diagnostico",
      kind: "diagnostico",
      summary: result.note?.slice(0, 500) ?? "Diagnóstico inicial",
      confidence: result.confidence ?? 40,
      importance: "alta",
      payload: result as never,
    });

    return { result, threshold: CONFIDENCE_THRESHOLD.alta };
  });

/* ─────────────── Motor de enseñanza ─────────────── */

export const teach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conceptId: z.string().optional(),
        subjectId: z.string().optional(),
        topic: z.string().max(200).optional(),
        mode: z.string().default("aprender"),
        difficulty: z.number().min(1).max(5).default(3),
        request: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concept } = data.conceptId
      ? await context.supabase.from("merlin_concepts").select("*").eq("id", data.conceptId).eq("user_id", context.userId).maybeSingle()
      : { data: null };
    const { data: strategies } = await context.supabase
      .from("merlin_strategies")
      .select("strategy, wins, losses, confidence")
      .eq("user_id", context.userId)
      .order("confidence", { ascending: false })
      .limit(8);

    const text = await ask(
      `Motor pedagógico. Modo: ${data.mode}. Dificultad ${data.difficulty}/5.
Adaptas la explicación al estado real del alumno, incluyes preguntas de comprobación durante la explicación y NUNCA entregas la solución completa si el alumno está aprendiendo.
Estrategias con historial: ${JSON.stringify(strategies ?? [])}.`,
      `Concepto: ${concept?.name ?? data.topic ?? "tema libre"}.
Dominio actual: ${concept ? `${concept.overall}% (confianza ${concept.confidence}%)` : "desconocido"}.
Petición del alumno: ${data.request ?? "Explícame este tema"}.
Estructura: idea central → explicación adaptada → ejemplo → analogía → 2 preguntas de comprobación → siguiente paso.`,
    );

    await context.supabase.from("merlin_sessions").insert({
      user_id: context.userId,
      subject_id: data.subjectId ?? concept?.subject_id ?? null,
      concept_id: data.conceptId ?? null,
      mode: data.mode,
      strategy: "explicacion",
      minutes: 0,
    });

    return { text };
  });

/* ─────────────── Práctica ─────────────── */

export const generatePractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conceptId: z.string().optional(),
        topic: z.string().max(200).optional(),
        kind: z.string().default("guiada"),
        count: z.number().min(1).max(8).default(4),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concept } = data.conceptId
      ? await context.supabase.from("merlin_concepts").select("name, overall").eq("id", data.conceptId).eq("user_id", context.userId).maybeSingle()
      : { data: null };
    const items = await askJson<{ items: { prompt: string; hint: string; expects: string; difficulty: number }[] }>(
      "Generas práctica con propósito: cada ejercicio ataca una necesidad detectada.",
      `Concepto: ${concept?.name ?? data.topic ?? "general"} (dominio ${concept?.overall ?? "?"}%).
Tipo de práctica: ${data.kind}. Cantidad: ${data.count}.
Formato: {"items":[{"prompt","hint","expects","difficulty":1-5}]}`,
      { items: [] },
    );
    return items;
  });

/* ─────────────── Agentes + evidencia + confianza ─────────────── */

export const evaluateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conceptId: z.string().optional(),
        subjectId: z.string().optional(),
        question: z.string().max(2000),
        answer: z.string().max(4000),
        importance: z.enum(["baja", "media", "alta"]).default("media"),
        strategy: z.string().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concept } = data.conceptId
      ? await context.supabase.from("merlin_concepts").select("*").eq("id", data.conceptId).eq("user_id", context.userId).maybeSingle()
      : { data: null };
    const { data: history } = await context.supabase
      .from("merlin_evidence")
      .select("agent, summary, correct, confidence, created_at")
      .eq("user_id", context.userId)
      .eq("concept_id", data.conceptId ?? "")
      .order("created_at", { ascending: false })
      .limit(8);

    const analysis = await askJson<{
      correct: boolean;
      feedback: string;
      agents: { agent: string; observation: string; hypothesis: string; confidence: number }[];
      mastery: { comprension: number; aplicacion: number; transferencia: number; retencion: number };
      confidence: number;
      strategy_working: boolean;
      next: string;
    }>(
      `Coordinas cinco agentes que producen EVIDENCIA e HIPÓTESIS, nunca verdades:
${MERLIN_AGENTS.map((a) => `- ${a.id}: ${a.prompt}`).join("\n")}`,
      `Concepto: ${concept?.name ?? "libre"}. Dominio previo: ${concept?.overall ?? 0}% (confianza ${concept?.confidence ?? 0}%).
Evidencia previa: ${JSON.stringify(history ?? []).slice(0, 2000)}.
Pregunta: ${data.question}
Respuesta del alumno: ${data.answer}
Estrategia usada: ${data.strategy ?? "explicacion"}.
Formato: {"correct":bool,"feedback":"retroalimentación al alumno sin dar la solución completa","agents":[{"agent","observation","hypothesis","confidence":0-100}],"mastery":{"comprension","aplicacion","transferencia","retencion"},"confidence":0-100,"strategy_working":bool,"next":"siguiente paso sugerido"}`,
      {
        correct: false,
        feedback: "No tengo suficiente evidencia para juzgar esta respuesta.",
        agents: [],
        mastery: { comprension: 0, aplicacion: 0, transferencia: 0, retencion: 0 },
        confidence: 30,
        strategy_working: true,
        next: "Pide una aclaración al alumno.",
      },
    );

    const threshold = CONFIDENCE_THRESHOLD[data.importance as Importance];
    const actionable = (analysis.confidence ?? 0) >= threshold;

    if (analysis.agents?.length) {
      await context.supabase.from("merlin_evidence").insert(
        analysis.agents.slice(0, 5).map((a) => ({
          user_id: context.userId,
          subject_id: data.subjectId ?? concept?.subject_id ?? null,
          concept_id: data.conceptId ?? null,
          agent: a.agent?.slice(0, 40) ?? "analizador",
          kind: "hipotesis",
          summary: (a.observation ?? "").slice(0, 500),
          hypothesis: (a.hypothesis ?? "").slice(0, 500),
          correct: analysis.correct,
          confidence: Math.max(0, Math.min(100, a.confidence ?? 50)),
          importance: data.importance,
        })) as never,
      );
    }

    // El dominio solo se actualiza cuando la evidencia supera el umbral (memoria evolutiva, no etiqueta).
    if (concept && actionable) {
      const prev = (concept.mastery ?? {}) as Record<string, number>;
      const blend = (k: keyof typeof analysis.mastery) =>
        Math.round(((prev[k] ?? 0) * 2 + (analysis.mastery?.[k] ?? 0)) / 3);
      const mastery = {
        comprension: blend("comprension"),
        aplicacion: blend("aplicacion"),
        transferencia: blend("transferencia"),
        retencion: blend("retencion"),
      };
      const vals = Object.values(mastery);
      const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      await context.supabase
        .from("merlin_concepts")
        .update({
          mastery,
          overall,
          confidence: Math.round(((concept.confidence ?? 0) + (analysis.confidence ?? 50)) / 2),
          status: statusFromOverall(overall, true),
          last_review_at: new Date().toISOString(),
        })
        .eq("id", concept.id)
        .eq("user_id", context.userId);

      // Recuperación espaciada
      if (overall >= 70) {
        const due = new Date(Date.now() + 1000 * 60 * 60 * 24 * (overall >= 85 ? 14 : 7));
        await context.supabase.from("merlin_recalls").insert({
          user_id: context.userId,
          concept_id: concept.id,
          due_at: due.toISOString(),
          question: `Comprobación de retención: ${concept.name}`,
        });
      }
    }

    // Memoria de estrategias
    const strategy = data.strategy ?? "explicacion";
    const kind = concept?.area ?? "general";
    const { data: row } = await context.supabase
      .from("merlin_strategies")
      .select("*")
      .eq("user_id", context.userId)
      .eq("concept_kind", kind)
      .eq("strategy", strategy)
      .maybeSingle();
    const win = analysis.strategy_working !== false && analysis.correct;
    if (row) {
      const wins = row.wins + (win ? 1 : 0);
      const losses = row.losses + (win ? 0 : 1);
      await context.supabase
        .from("merlin_strategies")
        .update({
          wins,
          losses,
          confidence: Math.round((wins / Math.max(1, wins + losses)) * 100),
          last_used_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else {
      await context.supabase.from("merlin_strategies").insert({
        user_id: context.userId,
        concept_kind: kind,
        strategy,
        wins: win ? 1 : 0,
        losses: win ? 0 : 1,
        confidence: win ? 100 : 0,
        last_used_at: new Date().toISOString(),
      });
    }

    return { analysis, actionable, threshold };
  });

/* ─────────────── Ruta adaptativa ─────────────── */

export const planRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ subjectId: z.string(), goal: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const [{ data: concepts }, { data: relations }, { data: current }] = await Promise.all([
      context.supabase.from("merlin_concepts").select("id, name, overall, confidence, status").eq("subject_id", data.subjectId).eq("user_id", context.userId),
      context.supabase.from("merlin_relations").select("from_concept, to_concept, kind").eq("subject_id", data.subjectId).eq("user_id", context.userId),
      context.supabase.from("merlin_routes").select("*").eq("subject_id", data.subjectId).eq("user_id", context.userId).eq("active", true).maybeSingle(),
    ]);

    const plan = await askJson<{
      steps: { title: string; concept?: string; mode: string; minutes: number; why: string }[];
      reason: string;
      confidence: number;
      keep_current: boolean;
    }>(
      "Motor de ruta adaptativa. Si la ruta actual funciona, NO se toca. Solo reconstruyes con evidencia de que dejó de funcionar. Permites navegación libre indicando prerrequisitos faltantes.",
      `Objetivo: ${data.goal ?? "dominar la materia"}.
Conceptos: ${JSON.stringify(concepts ?? []).slice(0, 3000)}
Relaciones: ${JSON.stringify(relations ?? []).slice(0, 2000)}
Ruta actual: ${JSON.stringify(current?.steps ?? []).slice(0, 1500)}
Formato: {"steps":[{"title","concept","mode","minutes","why"}],"reason","confidence":0-100,"keep_current":bool}`,
      { steps: [], reason: "Evidencia insuficiente", confidence: 40, keep_current: true },
    );

    if (!(plan.keep_current && current)) {
      if (current) await context.supabase.from("merlin_routes").update({ active: false }).eq("id", current.id);
      await context.supabase.from("merlin_routes").insert({
        user_id: context.userId,
        subject_id: data.subjectId,
        steps: plan.steps as never,
        reason: plan.reason?.slice(0, 600),
        confidence: plan.confidence ?? 50,
      });
    }
    return { plan };
  });

/* ─────────────── Biblioteca ─────────────── */

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("merlin_documents")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { documents: data ?? [] };
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(160),
        content: z.string().max(60000),
        kind: z.string().max(30).default("apunte"),
        subjectId: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const analysis = await askJson<{ summary: string; concepts: string[] }>(
      "Analizas material de estudio y extraes su estructura conceptual.",
      `Título: ${data.title}\nContenido: ${data.content.slice(0, 12000)}\nFormato: {"summary":"resumen en 5 líneas","concepts":["..."]}`,
      { summary: "", concepts: [] },
    );
    const { data: doc, error } = await context.supabase
      .from("merlin_documents")
      .insert({
        user_id: context.userId,
        subject_id: data.subjectId ?? null,
        title: data.title,
        kind: data.kind,
        content: data.content.slice(0, 60000),
        summary: analysis.summary?.slice(0, 2000) ?? null,
        concepts: (analysis.concepts ?? []).slice(0, 20),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { document: doc };
  });

export const askLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => z.object({ query: z.string().min(2).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: docs } = await context.supabase
      .from("merlin_documents")
      .select("title, summary, concepts, content")
      .eq("user_id", context.userId)
      .limit(20);
    const corpus = (docs ?? [])
      .map((d) => `### ${d.title}\n${d.summary ?? ""}\n${(d.content ?? "").slice(0, 3000)}`)
      .join("\n\n")
      .slice(0, 24000);
    const text = await ask(
      "Respondes usando SOLO la base de conocimiento personal del alumno. Citas el documento del que sale cada idea y relacionas conceptos entre documentos. Si no está, lo dices.",
      `Base:\n${corpus || "(vacía)"}\n\nPregunta: ${data.query}`,
    );
    return { text };
  });

/* ─────────────── Exámenes, escritura, investigación, laboratorio ─────────────── */

export const buildExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ subjectId: z.string().optional(), topic: z.string().max(200).optional(), count: z.number().min(3).max(15).default(8), minutes: z.number().min(5).max(180).default(30) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concepts } = data.subjectId
      ? await context.supabase.from("merlin_concepts").select("name, overall").eq("subject_id", data.subjectId).eq("user_id", context.userId)
      : { data: [] };
    const exam = await askJson<{
      questions: { question: string; options: string[]; answer: number; concept: string; difficulty: number }[];
      pass_probability: number;
      note: string;
    }>(
      "Construyes simuladores de examen con dificultad adaptada al dominio real y estimas probabilidad de aprobar con su nivel de confianza.",
      `Tema: ${data.topic ?? "materia completa"}. Conceptos y dominio: ${JSON.stringify(concepts ?? []).slice(0, 2000)}.
${data.count} preguntas de opción múltiple (4 opciones), ${data.minutes} minutos.
Formato: {"questions":[{"question","options","answer":0-3,"concept","difficulty":1-5}],"pass_probability":0-100,"note"}`,
      { questions: [], pass_probability: 0, note: "" },
    );
    return exam;
  });

export const writingCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task: z.string().max(40), text: z.string().max(20000), style: z.string().max(30).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await ask(
      "Centro de escritura académica: redacción, ortografía, estilo, coherencia, humanización y citas (APA, MLA, Chicago). Explicas los cambios importantes.",
      `Tarea: ${data.task}. Formato de cita: ${data.style ?? "APA 7"}.\nTexto:\n${data.text}`,
    );
    return { text };
  });

export const research = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => z.object({ query: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ data }) => {
    let web = "";
    try {
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(data.query)}&format=json&no_html=1`,
      );
      const json = (await res.json()) as { AbstractText?: string; RelatedTopics?: { Text?: string; FirstURL?: string }[] };
      web = [json.AbstractText, ...(json.RelatedTopics ?? []).slice(0, 8).map((t) => `${t.Text} — ${t.FirstURL}`)]
        .filter(Boolean)
        .join("\n");
    } catch {
      web = "";
    }
    const text = await ask(
      "Investigación académica: comparas fuentes, señalas su fiabilidad, resumes artículos y generas bibliografía en APA. Distingues lo verificado de lo incierto.",
      `Consulta: ${data.query}\nResultados web:\n${web || "(sin resultados; indícalo)"}`,
    );
    return { text };
  });

export const runLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ area: z.string().max(40), prompt: z.string().max(600) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sim = await askJson<{ title: string; explanation: string; variables: { name: string; unit: string; min: number; max: number; value: number }[]; formula: string; steps: string[] }>(
      "Diseñas simulaciones educativas parametrizables (física, química, biología). La fórmula debe ser una expresión JavaScript válida usando los nombres de las variables.",
      `Área: ${data.area}. Petición: ${data.prompt}
Formato: {"title","explanation","variables":[{"name","unit","min","max","value"}],"formula":"expresión JS","steps":["..."]}`,
      { title: data.prompt, explanation: "", variables: [], formula: "0", steps: [] },
    );
    return sim;
  });

/* ─────────────── Memoria, analítica, repasos ─────────────── */

export const merlinOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [subjects, concepts, sessions, evidence, recalls, strategies, goals] = await Promise.all([
      context.supabase.from("merlin_subjects").select("id, name").eq("user_id", uid),
      context.supabase.from("merlin_concepts").select("id, name, overall, confidence, status, mastery, subject_id, last_review_at").eq("user_id", uid),
      context.supabase.from("merlin_sessions").select("minutes, mode, created_at, score").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
      context.supabase.from("merlin_evidence").select("agent, summary, hypothesis, confidence, importance, created_at, concept_id").eq("user_id", uid).order("created_at", { ascending: false }).limit(40),
      context.supabase.from("merlin_recalls").select("*").eq("user_id", uid).eq("status", "pendiente").order("due_at").limit(20),
      context.supabase.from("merlin_strategies").select("*").eq("user_id", uid).order("confidence", { ascending: false }).limit(20),
      context.supabase.from("merlin_goals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    return {
      subjects: subjects.data ?? [],
      concepts: concepts.data ?? [],
      sessions: sessions.data ?? [],
      evidence: evidence.data ?? [],
      recalls: recalls.data ?? [],
      strategies: strategies.data ?? [],
      goals: goals.data ?? [],
    };
  });

export const answerRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), result: z.enum(["ok", "fallo"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("merlin_recalls")
      .update({ status: "hecho", result: data.result })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const upsertGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().optional(), title: z.string().min(2).max(160), kind: z.string().max(30).default("dominio"), target_date: z.string().optional(), subjectId: z.string().optional(), progress: z.number().min(0).max(100).optional(), status: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const row = {
      user_id: context.userId,
      title: data.title,
      kind: data.kind,
      target_date: data.target_date ?? null,
      subject_id: data.subjectId ?? null,
      ...(data.progress != null ? { progress: data.progress } : {}),
      ...(data.status ? { status: data.status } : {}),
    };
    if (data.id) {
      await context.supabase.from("merlin_goals").update(row).eq("id", data.id).eq("user_id", context.userId);
    } else {
      await context.supabase.from("merlin_goals").insert(row);
    }
    return { ok: true };
  });

export const merlinChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().min(1).max(4000),
        section: z.string().max(40).default("inicio"),
        mode: z.string().max(20).default("aprender"),
        conceptId: z.string().optional(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).default([]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAccess(context.supabase, context.userId);
    const { data: concepts } = await context.supabase
      .from("merlin_concepts")
      .select("name, overall, confidence, status")
      .eq("user_id", context.userId)
      .order("overall")
      .limit(20);
    const { data: evidence } = await context.supabase
      .from("merlin_evidence")
      .select("agent, summary, hypothesis, confidence")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(8);

    const dims = SUBJECT_DIMENSIONS.general.join(", ");
    const text = await ask(
      `Sección activa: ${data.section}. Modo: ${data.mode}. Dimensiones de dominio: ${dims}.
Mapa personal (dominio %): ${JSON.stringify(concepts ?? []).slice(0, 2000)}
Evidencia reciente (hipótesis, no hechos): ${JSON.stringify(evidence ?? []).slice(0, 1500)}`,
      `${data.history.map((h) => `${h.role === "user" ? "Alumno" : "Merlin"}: ${h.content}`).join("\n")}\nAlumno: ${data.message}`,
    );
    return { text };
  });
