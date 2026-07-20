import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { LayoutSchema } from "./section-blocks";

type SB = SupabaseClient<Database>;

type Ctx = {
  supabase: SB;
  userId: string;
  apiKey: string; // LOVABLE_API_KEY
};

/* ---------------- IMAGE GENERATION ---------------- */
const generateImage = (ctx: Ctx) =>
  tool({
    description:
      "Genera una imagen con IA a partir de un prompt en lenguaje natural y la guarda en la galería del usuario. Úsalo cuando el usuario pida crear, dibujar, generar o visualizar una imagen, escena, retrato, logo, etc.",
    inputSchema: z.object({
      prompt: z.string().min(3).max(2000).describe("Descripción detallada de la imagen a generar"),
    }),
    execute: async ({ prompt }) => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `Image gateway ${res.status}: ${t.slice(0, 200)}` };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
      };
      const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const m = dataUrl?.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!m) return { ok: false, error: "Sin datos de imagen" };
      const mime = m[1];
      const b64 = m[2];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ext = mime.split("/")[1] ?? "png";
      const path = `${ctx.userId}/${Date.now()}.${ext}`;
      const up = await ctx.supabase.storage
        .from("generated-images")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (up.error) return { ok: false, error: up.error.message };
      const { data: signed } = await ctx.supabase.storage
        .from("generated-images")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const publicUrl = signed?.signedUrl ?? "";
      await ctx.supabase.from("generated_images").insert({
        user_id: ctx.userId,
        prompt,
        storage_path: path,
        public_url: publicUrl,
      });
      return { ok: true, url: publicUrl, prompt };
    },
  });

/* ---------------- SAVE DOCUMENT ---------------- */
const saveDocument = (ctx: Ctx) =>
  tool({
    description:
      "Guarda un documento de texto/markdown en la biblioteca del usuario. Úsalo cuando el usuario pida guardar, archivar o crear un documento, nota, ensayo, plan, resumen, etc.",
    inputSchema: z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1).max(50000).describe("Contenido en markdown o texto plano"),
      format: z.enum(["md", "txt"]).default("md"),
    }),
    execute: async ({ title, content, format }) => {
      const fileName = `${title.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 80)}.${format}`;
      const path = `${ctx.userId}/${Date.now()}-${fileName}`;
      const mime = format === "md" ? "text/markdown" : "text/plain";
      const up = await ctx.supabase.storage
        .from("generated-docs")
        .upload(path, new Blob([content], { type: mime }), { contentType: mime, upsert: false });
      if (up.error) return { ok: false, error: up.error.message };
      const ins = await ctx.supabase
        .from("generated_documents")
        .insert({
          user_id: ctx.userId,
          title,
          prompt: title,
          format,
          file_name: fileName,
          mime_type: mime,
          storage_path: path,
        })
        .select("id")
        .single();
      if (ins.error) return { ok: false, error: ins.error.message };
      return { ok: true, id: ins.data.id, title, format };
    },
  });

/* ---------------- MEMORY ---------------- */
const remember = (ctx: Ctx) =>
  tool({
    description:
      "Guarda un hecho o preferencia personal del usuario para recordarlo en el futuro. Clave corta (snake_case) + valor en lenguaje natural.",
    inputSchema: z.object({
      key: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_\-.:]+$/),
      value: z.string().min(1).max(2000),
    }),
    execute: async ({ key, value }) => {
      // upsert manual
      const { data: existing } = await ctx.supabase
        .from("user_memory")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("key", key)
        .maybeSingle();
      if (existing) {
        const { error } = await ctx.supabase
          .from("user_memory")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await ctx.supabase
          .from("user_memory")
          .insert({ user_id: ctx.userId, key, value });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true, key };
    },
  });

const recall = (ctx: Ctx) =>
  tool({
    description:
      "Recupera memorias guardadas del usuario. Si pasas 'query', filtra por coincidencia parcial en clave o valor; si no, devuelve las más recientes.",
    inputSchema: z.object({
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    execute: async ({ query, limit }) => {
      let q = ctx.supabase
        .from("user_memory")
        .select("key, value, updated_at")
        .eq("user_id", ctx.userId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (query) q = q.or(`key.ilike.%${query}%,value.ilike.%${query}%`);
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, memories: data ?? [] };
    },
  });

/* ---------------- WHATSAPP ---------------- */
const sendWhatsapp = (ctx: Ctx) =>
  tool({
    description:
      "Envía un mensaje de WhatsApp. Usa 'contact_name' para buscar en la libreta del usuario, o 'phone' (E.164 sin '+', ej. 521555...) si ya lo conoces.",
    inputSchema: z.object({
      contact_name: z.string().max(80).optional(),
      phone: z.string().regex(/^\d{8,15}$/).optional(),
      message: z.string().min(1).max(4000),
    }),
    execute: async ({ contact_name, phone, message }) => {
      let to = phone;
      let resolvedName: string | undefined;
      if (!to && contact_name) {
        const { data } = await ctx.supabase
          .from("whatsapp_contacts")
          .select("phone, name")
          .eq("user_id", ctx.userId)
          .ilike("name", `%${contact_name}%`)
          .limit(1)
          .maybeSingle();
        if (data) {
          to = data.phone.replace(/[^\d]/g, "");
          resolvedName = data.name;
        }
      }
      if (!to) return { ok: false, error: "No se encontró el contacto. Da un número o nombre válido." };

      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!token || !phoneId) return { ok: false, error: "WhatsApp no configurado" };

      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `WhatsApp ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true, to, contact: resolvedName ?? to };
    },
  });

/* ---------------- MUSIC (Spotify search, client credentials) ---------------- */
let spotifyTokenCache: { token: string; exp: number } | null = null;
async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyTokenCache && spotifyTokenCache.exp > now + 30_000) return spotifyTokenCache.token;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify no configurado");
  const basic = btoa(`${id}:${secret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  spotifyTokenCache = { token: j.access_token, exp: now + j.expires_in * 1000 };
  return j.access_token;
}

const searchMusic = (_ctx: Ctx) =>
  tool({
    description:
      "Busca canciones en Spotify. Devuelve título, artista, álbum y URL para escuchar. Úsalo cuando el usuario pida recomendaciones musicales, playlists o canciones específicas.",
    inputSchema: z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ query, limit }) => {
      try {
        const token = await getSpotifyToken();
        const url = `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return { ok: false, error: `Spotify ${res.status}` };
        const j = (await res.json()) as {
          tracks?: {
            items?: Array<{
              name: string;
              artists: { name: string }[];
              album: { name: string; images: { url: string }[] };
              external_urls: { spotify: string };
            }>;
          };
        };
        const items = (j.tracks?.items ?? []).map((t) => ({
          title: t.name,
          artist: t.artists.map((a) => a.name).join(", "),
          album: t.album.name,
          cover: t.album.images[0]?.url,
          url: t.external_urls.spotify,
        }));
        return { ok: true, tracks: items };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "error" };
      }
    },
  });

/* ---------------- SELF-EXTENSION: sections + skills ---------------- */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `sec-${Date.now().toString(36)}`;

const createSectionTool = (ctx: Ctx) =>
  tool({
    description:
      "Crea una nueva sección personalizada en el sidebar del usuario, compuesta por bloques (stat/list/chart/action/chat_prompt/markdown). Úsalo cuando el usuario pida que la app cree una sección nueva para trackear, visualizar u organizar algo. Elige bloques y fuentes de la whitelist.",
    inputSchema: z.object({
      assistant: z.enum(["nova", "nevira"]).default("nova"),
      label: z.string().min(1).max(60),
      icon: z.string().max(40).optional().describe("emoji o nombre de icono lucide"),
      accent: z.string().max(40).optional().describe("color HSL o hex"),
      layout: LayoutSchema,
    }),
    execute: async (input) => {
      const slug = slugify(input.label);
      const { data, error } = await ctx.supabase
        .from("user_sections")
        .insert({
          user_id: ctx.userId,
          assistant: input.assistant,
          slug,
          label: input.label,
          icon: input.icon ?? null,
          accent: input.accent ?? null,
          layout: input.layout as unknown as never,
          created_by: "ai",
        } as never)
        .select("slug, label")
        .single();
      if (error) return { ok: false, error: error.message };
      const row = data as unknown as { slug: string; label: string };
      return { ok: true, slug: row.slug, label: row.label };
    },
  });

const attachSkillTool = (ctx: Ctx) =>
  tool({
    description:
      "Registra un skill ejecutable (prompt/instrucciones) que la app puede invocar desde un bloque 'action'. El skill se ejecuta como un mini-agente con su propia descripción y código en texto. Úsalo cuando una sección necesite una acción reutilizable.",
    inputSchema: z.object({
      section_slug: z.string().max(40).optional(),
      name: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, "snake_case"),
      description: z.string().min(1).max(400),
      code: z.string().min(1).max(6000).describe("Instrucciones/prompt del skill en texto plano"),
    }),
    execute: async (input) => {
      const { data: existing } = await ctx.supabase
        .from("agent_skills")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("name", input.name)
        .maybeSingle();
      const payload = {
        user_id: ctx.userId,
        name: input.name,
        description: input.description,
        code: input.code,
        section_slug: input.section_slug ?? null,
        enabled: true,
      };
      if (existing) {
        const { error } = await ctx.supabase
          .from("agent_skills")
          .update(payload as never)
          .eq("id", existing.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, name: input.name, updated: true };
      }
      const { error } = await ctx.supabase.from("agent_skills").insert(payload as never);
      if (error) return { ok: false, error: error.message };
      return { ok: true, name: input.name, created: true };
    },
  });

/* ---------------- CODE PREVIEW (generates a runnable component + section) ---------------- */
const generateComponent = (ctx: Ctx) =>
  tool({
    description:
      "Genera un componente/mini-app funcional (HTML+JS+CSS autocontenido) a partir de una descripción y crea una sección con vista previa en vivo (iframe) y el código visible. Úsalo cuando el usuario pida crear una calculadora, formulario, widget, juego simple, visualización, etc.",
    inputSchema: z.object({
      title: z.string().min(1).max(80),
      assistant: z.enum(["nova", "nevira"]).default("nova"),
      html: z
        .string()
        .min(20)
        .max(60000)
        .describe(
          "Documento HTML completo y autocontenido con <style> y <script> embebidos. Debe ejecutarse dentro de un iframe con sandbox='allow-scripts' (sin acceso al padre).",
        ),
    }),
    execute: async ({ title, assistant, html }) => {
      const slug = slugify(title);
      const { data: art } = await ctx.supabase
        .from("code_artifacts")
        .insert({
          user_id: ctx.userId,
          title,
          language: "html",
          code: html,
        } as never)
        .select("id")
        .single();
      const layout = {
        blocks: [
          { type: "code_preview" as const, title, language: "html" as const, code: html, height: 480 },
        ],
      };
      const { error } = await ctx.supabase
        .from("user_sections")
        .insert({
          user_id: ctx.userId,
          assistant,
          slug,
          label: title,
          icon: "code",
          layout: layout as unknown as never,
          created_by: "ai",
        } as never);
      if (error) return { ok: false, error: error.message };
      return { ok: true, slug, artifact_id: (art as { id: string } | null)?.id };
    },
  });

/* ---------------- OFFICE DOCS (docx / xlsx / pptx) ---------------- */
const generateOfficeDocument = (ctx: Ctx) =>
  tool({
    description:
      "Genera un documento Office real (docx, xlsx o pptx) desde una estructura semántica, lo guarda en la biblioteca del usuario y devuelve una URL firmada visualizable en la app. Úsalo para Word, Excel o PowerPoint.",
    inputSchema: z.object({
      title: z.string().min(1).max(120),
      format: z.enum(["docx", "xlsx", "pptx"]),
      // Semantic content — the tool decides how to render per format.
      docx: z
        .object({
          paragraphs: z.array(
            z.object({
              text: z.string(),
              heading: z.enum(["h1", "h2", "h3", "p"]).default("p"),
              bold: z.boolean().optional(),
            }),
          ),
        })
        .optional(),
      xlsx: z
        .object({
          sheets: z.array(
            z.object({
              name: z.string().max(31),
              rows: z.array(z.object({ cells: z.array(z.string()) })),
            }),
          ),
        })
        .optional(),
      pptx: z
        .object({
          slides: z.array(
            z.object({
              title: z.string(),
              bullets: z.array(z.string()).default([]),
              notes: z.string().optional(),
            }),
          ),
        })
        .optional(),
    }),
    execute: async ({ title, format, docx: docxIn, xlsx: xlsxIn, pptx: pptxIn }) => {
      try {
        let bytes: Uint8Array;
        let mime: string;
        if (format === "docx") {
          const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
          const paragraphs = (docxIn?.paragraphs ?? [{ text: title, heading: "h1" as const }]).map(
            (p) =>
              new Paragraph({
                heading:
                  p.heading === "h1"
                    ? HeadingLevel.HEADING_1
                    : p.heading === "h2"
                    ? HeadingLevel.HEADING_2
                    : p.heading === "h3"
                    ? HeadingLevel.HEADING_3
                    : undefined,
                children: [new TextRun({ text: p.text, bold: p.bold })],
              }),
          );
          const doc = new Document({ sections: [{ children: paragraphs }] });
          const buf = await Packer.toBuffer(doc);
          bytes = new Uint8Array(buf);
          mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (format === "xlsx") {
          const ExcelJS = (await import("exceljs")).default;
          const wb = new ExcelJS.Workbook();
          const sheets = xlsxIn?.sheets ?? [{ name: "Hoja1", rows: [{ cells: [title] }] }];
          for (const s of sheets) {
            const ws = wb.addWorksheet(s.name.slice(0, 31) || "Hoja");
            for (const row of s.rows) ws.addRow((Array.isArray(row) ? row : row.cells).map((v) => v ?? ""));
          }
          const buf = await wb.xlsx.writeBuffer();
          bytes = new Uint8Array(buf as ArrayBuffer);
          mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else {
          const PptxGenJs = (await import("pptxgenjs")).default;
          const p = new PptxGenJs();
          const slides = pptxIn?.slides ?? [{ title, bullets: [] }];
          for (const s of slides) {
            const slide = p.addSlide();
            slide.addText(s.title, { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 28, bold: true });
            if (s.bullets.length) {
              slide.addText(
                s.bullets.map((b) => ({ text: b, options: { bullet: true } })),
                { x: 0.6, y: 1.3, w: 8.8, h: 5, fontSize: 16 },
              );
            }
            if (s.notes) slide.addNotes(s.notes);
          }
          const buf = (await p.write({ outputType: "nodebuffer" })) as Buffer;
          bytes = new Uint8Array(buf);
          mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        }
        const fileName = `${title.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 80)}.${format}`;
        const path = `${ctx.userId}/${Date.now()}-${fileName}`;
        const up = await ctx.supabase.storage
          .from("generated-docs")
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (up.error) return { ok: false, error: up.error.message };
        const { data: signed } = await ctx.supabase.storage
          .from("generated-docs")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        const url = signed?.signedUrl ?? "";
        await ctx.supabase.from("generated_documents").insert({
          user_id: ctx.userId,
          title,
          prompt: title,
          format,
          file_name: fileName,
          mime_type: mime,
          storage_path: path,
        });
        return { ok: true, url, format, title };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "office error" };
      }
    },
  });

/* ---------------- Build set ---------------- */
export function buildChatTools(ctx: Ctx) {
  return {
    generate_image: generateImage(ctx),
    save_document: saveDocument(ctx),
    remember: remember(ctx),
    recall: recall(ctx),
    send_whatsapp: sendWhatsapp(ctx),
    search_music: searchMusic(ctx),
    create_section: createSectionTool(ctx),
    attach_skill: attachSkillTool(ctx),
    generate_component: generateComponent(ctx),
    generate_office_document: generateOfficeDocument(ctx),
  };
}
