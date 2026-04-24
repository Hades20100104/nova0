import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import XLSX from "xlsx";

interface GenerateDocInput {
  format: "docx" | "xlsx" | "pptx";
  prompt: string;
  themeName: "NEVIRA" | "NOVA";
}

interface DocPlan {
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    bullets: string[];
  }>;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "documento";
}

async function buildPlan(prompt: string): Promise<DocPlan> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("La IA no está configurada en el servidor.");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Devuelve JSON con title, summary, sections[{heading, bullets[]}], y opcional table{headers, rows}. Crea contenido claro, útil y breve en español.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("No pude preparar el documento.");
  }

  const json = await response.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<DocPlan>;

  const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Documento";
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections
        .map((section) => ({
          heading: typeof section?.heading === "string" ? section.heading.trim() : "Sección",
          bullets: Array.isArray(section?.bullets)
            ? section.bullets.filter((bullet): bullet is string => typeof bullet === "string" && bullet.trim().length > 0).slice(0, 6)
            : [],
        }))
        .filter((section) => section.heading && section.bullets.length > 0)
        .slice(0, 6)
    : [];

  const table = parsed.table && Array.isArray(parsed.table.headers) && Array.isArray(parsed.table.rows)
    ? {
        headers: parsed.table.headers.filter((cell): cell is string => typeof cell === "string").slice(0, 5),
        rows: parsed.table.rows
          .filter((row): row is string[] => Array.isArray(row))
          .map((row) => row.filter((cell): cell is string => typeof cell === "string").slice(0, 5))
          .filter((row) => row.length > 0)
          .slice(0, 6),
      }
    : undefined;

  return {
    title,
    summary,
    sections: sections.length > 0 ? sections : [{ heading: "Contenido", bullets: [prompt] }],
    table,
  };
}

async function createDocx(plan: DocPlan) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: plan.title, bold: true })] }),
        new Paragraph({ children: [new TextRun(plan.summary)] }),
        ...plan.sections.flatMap((section) => [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: section.heading, bold: true })] }),
          ...section.bullets.map((bullet) => new Paragraph({ text: `• ${bullet}` })),
        ]),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  return { base64: buffer.toString("base64"), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
}

async function createXlsx(plan: DocPlan) {
  const wb = XLSX.utils.book_new();
  const overview = [
    [plan.title],
    [plan.summary],
    [],
    ["Sección", "Punto"],
    ...plan.sections.flatMap((section) => section.bullets.map((bullet) => [section.heading, bullet])),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(overview);
  sheet["!cols"] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Resumen");
  if (plan.table && plan.table.headers.length > 0) {
    const tableSheet = XLSX.utils.aoa_to_sheet([plan.table.headers, ...plan.table.rows]);
    tableSheet["!cols"] = plan.table.headers.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, tableSheet, "Tabla");
  }
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return { base64: Buffer.from(buffer).toString("base64"), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

async function createPptx(plan: DocPlan) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Lovable";
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "1C1F2A" };
  titleSlide.addText(plan.title, { x: 0.6, y: 1.0, w: 8.8, h: 0.7, fontSize: 24, bold: true, color: "F7F8FA" });
  titleSlide.addText(plan.summary, { x: 0.6, y: 1.9, w: 9.1, h: 1.2, fontSize: 13, color: "D6D9E3" });

  plan.sections.slice(0, 4).forEach((section) => {
    const slide = pptx.addSlide();
    slide.background = { color: "F7F8FA" };
    slide.addText(section.heading, { x: 0.6, y: 0.5, w: 8.8, h: 0.5, fontSize: 22, bold: true, color: "1C1F2A" });
    slide.addText(section.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 18 } } })), {
      x: 0.8,
      y: 1.3,
      w: 8.4,
      h: 4.5,
      fontSize: 16,
      color: "333743",
      breakLine: true,
      margin: 0,
    });
  });

  const base64 = await pptx.write({ outputType: "base64" });
  if (typeof base64 !== "string") {
    throw new Error("No pude exportar la presentación.");
  }
  return { base64, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
}

export const generateDocument = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: GenerateDocInput) => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (!["docx", "xlsx", "pptx"].includes(input.format)) throw new Error("Formato inválido");
    if (typeof input.prompt !== "string" || input.prompt.trim().length < 6 || input.prompt.length > 3000) {
      throw new Error("Describe mejor el documento");
    }
    if (!input.themeName || !["NEVIRA", "NOVA"].includes(input.themeName)) throw new Error("Tema inválido");
    return input;
  })
  .handler(async ({ data }) => {
    const plan = await buildPlan(data.prompt.trim());
    const filename = `${sanitizeFilename(plan.title)}.${data.format}`;
    const file = data.format === "docx"
      ? await createDocx(plan)
      : data.format === "xlsx"
        ? await createXlsx(plan)
        : await createPptx(plan);

    return {
      fileName: filename,
      mimeType: file.mimeType,
      base64: file.base64,
      title: plan.title,
      summary: plan.summary,
    };
  });