import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { TrackHit } from "./spotify-player.functions";

export const VIBES = ["enfoque", "chill", "fiesta", "workout", "descubrimiento"] as const;
export type Vibe = (typeof VIBES)[number];

const Input = z.object({
  mode: z.enum(["set", "ask", "transition"]),
  vibe: z.enum(VIBES),
  question: z.string().max(300).optional(),
  current: z.object({ title: z.string().max(200), artist: z.string().max(200) }).optional(),
});

export type DjResult =
  | { ok: true; commentary: string; tracks: TrackHit[] }
  | { ok: false; message: string; code?: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["commentary", "picks"],
  properties: {
    commentary: { type: "string" },
    picks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "artist"],
        properties: { title: { type: "string" }, artist: { type: "string" } },
      },
    },
  },
};

async function askModel(apiKey: string, system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: system,
      input: user,
      text: { format: { type: "json_schema", name: "dj_set", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    const err = new Error(
      res.status === 402
        ? "Sin créditos de IA disponibles."
        : res.status === 429
          ? "El DJ está saturado, intenta en un momento."
          : `La IA no respondió (${res.status}). ${t.slice(0, 120)}`,
    );
    throw err;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
        if (ev.type === "response.refusal.delta") throw new Error("El DJ no puede responder a eso.");
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("El DJ")) throw e;
      }
    }
  }
  return JSON.parse(out) as { commentary: string; picks: { title: string; artist: string }[] };
}

export const runDj = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ context, data }): Promise<DjResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, message: "IA no configurada." };
    const { getUserToken, spotifyApi } = await import("./spotify-player.server");

    let token: string;
    try {
      token = await getUserToken(context.supabase, context.userId);
    } catch (e) {
      return { ok: false, code: "not_connected", message: e instanceof Error ? e.message : "Conecta Spotify" };
    }

    // Taste profile (best-effort; needs newer scopes)
    type T = { name: string; artists: { name: string }[] };
    const top = await spotifyApi<{ items: T[] }>(token, "/me/top/tracks?limit=15&time_range=short_term").catch(() => null);
    const recent = await spotifyApi<{ items: { track: T }[] }>(token, "/me/player/recently-played?limit=10").catch(() => null);
    const taste = [
      ...(top?.items ?? []).map((t) => `${t.name} — ${t.artists[0]?.name}`),
      ...(recent?.items ?? []).map((r) => `${r.track.name} — ${r.track.artists[0]?.name}`),
    ].slice(0, 20);

    const n = data.mode === "transition" ? 0 : 6;
    const system = `Eres AURA, una DJ de radio con IA, carismática, cálida y futurista. Hablas en español natural, como locutora en vivo.
Tu locución ("commentary") dura 2 a 4 frases (máx. 60 palabras), sin emojis ni markdown, pensada para leerse en voz alta.
Aporta un dato o comentario real y breve sobre el artista, el género o la vibra. Nunca inventes datos dudosos; si no sabes, habla de la sensación.
Devuelve exactamente ${n} canciones reales y existentes en Spotify en "picks" (vacío si se piden 0), acordes a la vibra y a los gustos del oyente, evitando repetir las que ya escuchó salvo 1 como ancla.`;
    const user = [
      `Vibra: ${data.vibe}.`,
      data.mode === "set" && "Arranca una sesión nueva: saluda brevemente y presenta la selección.",
      data.mode === "ask" && `Petición del oyente: "${data.question ?? ""}". Responde y recomienda.`,
      data.mode === "transition" && "Haz una transición en vivo presentando la canción que acaba de empezar.",
      data.current && `Sonando ahora: ${data.current.title} — ${data.current.artist}.`,
      taste.length ? `Gustos recientes del oyente: ${taste.join("; ")}.` : "No hay historial disponible; usa la vibra.",
    ]
      .filter(Boolean)
      .join("\n");

    let set: Awaited<ReturnType<typeof askModel>>;
    try {
      set = await askModel(apiKey, system, user);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Error del DJ" };
    }

    const tracks: TrackHit[] = [];
    type SpTrack = { id: string; uri: string; name: string; artists: { name: string }[]; album: { images: { url: string }[] } };
    for (const p of set.picks.slice(0, 8)) {
      const r = await spotifyApi<{ tracks: { items: SpTrack[] } }>(
        token,
        `/search?type=track&limit=1&q=${encodeURIComponent(`track:${p.title} artist:${p.artist}`)}`,
      ).catch(() => null);
      const t = r?.tracks.items[0];
      if (t) tracks.push({ uri: t.uri, id: t.id, title: t.name, artist: t.artists.map((a) => a.name).join(", "), cover: t.album.images.at(-1)?.url });
    }
    return { ok: true, commentary: set.commentary, tracks };
  });
