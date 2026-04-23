import { createServerFn } from "@tanstack/react-start";

interface GenerateImageInput {
  prompt: string;
}

/**
 * Genera una imagen usando Lovable AI Gateway (Nano Banana / Gemini image).
 * Devuelve la imagen como dataURL (base64). El cliente la sube al bucket
 * privado y registra la URL en la tabla `generated_images`.
 */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateImageInput) => {
    if (!input?.prompt || input.prompt.trim().length < 3) {
      throw new Error("Prompt demasiado corto");
    }
    if (input.prompt.length > 800) throw new Error("Prompt demasiado largo");
    return { prompt: input.prompt.trim() };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "LOVABLE_API_KEY no configurada.", dataUrl: null as string | null };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Genera una imagen de alta calidad: ${data.prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) {
      return { error: "Demasiadas peticiones. Espera un momento.", dataUrl: null };
    }
    if (res.status === 402) {
      return { error: "Sin créditos de IA. Añade fondos en Settings → Workspace → Usage.", dataUrl: null };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Image gen error:", res.status, text);
      return { error: `No se pudo generar la imagen (${res.status}): ${text.slice(0, 200)}`, dataUrl: null };
    }

    const json = await res.json().catch((e) => {
      console.error("Image gen JSON parse error:", e);
      return null;
    });
    if (!json) {
      return { error: "Respuesta inválida del servicio de imagen.", dataUrl: null };
    }
    const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) {
      return { error: "La IA no devolvió ninguna imagen.", dataUrl: null };
    }
    return { error: null as string | null, dataUrl };
  });
