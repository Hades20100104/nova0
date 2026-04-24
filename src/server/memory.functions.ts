import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

interface ExtractInput {
  userText: string;
  assistantText: string;
}

/**
 * Usa la IA para detectar si el último intercambio contiene un dato personal
 * digno de recordar (preferencia, gusto, dato biográfico, contexto recurrente).
 * Devuelve una nota corta o null si no hay nada que valga la pena guardar.
 *
 * Esto reemplaza la heurística regex anterior por una extracción real,
 * dando una "memoria contextual en tiempo real".
 */
export const extractMemoryNote = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: ExtractInput) => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (typeof input.userText !== "string" || input.userText.length === 0 || input.userText.length > 2000) {
      throw new Error("userText inválido");
    }
    if (typeof input.assistantText !== "string" || input.assistantText.length > 4000) {
      throw new Error("assistantText inválido");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { note: null as string | null };

    const systemPrompt = `Eres un extractor de memoria a largo plazo para un asistente personal.
Tu trabajo: leer un mensaje del usuario y decidir si contiene un dato que valga la pena recordar para futuras conversaciones (preferencia, gusto, hobby, profesión, contexto recurrente, persona importante en su vida, dato práctico).

Reglas:
- Si NO hay nada relevante (saludo, pregunta puntual, comando, charla casual), responde exactamente: NONE
- Si SÍ hay algo, responde con UNA frase corta en tercera persona, en español, máx 120 caracteres, sin comillas, sin emoji.
- No inventes nada que el usuario no haya dicho.
- No guardes datos sensibles (contraseñas, tarjetas, direcciones exactas).

Ejemplos:
Usuario: "soy programador y me gusta el rock" → Le gusta el rock y trabaja como programador.
Usuario: "ponme algo de Bad Bunny" → NONE
Usuario: "mi novia se llama Ana" → Su novia se llama Ana.
Usuario: "qué hora es" → NONE`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.userText },
          ],
        }),
      });
      if (!res.ok) return { note: null };
      const json = await res.json();
      const raw: string = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!raw || raw.toUpperCase() === "NONE" || raw.length > 200) return { note: null };
      return { note: raw };
    } catch (e) {
      console.error("extractMemoryNote error", e);
      return { note: null };
    }
  });
