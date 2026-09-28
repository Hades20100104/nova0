import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatInput {
  messages: ChatMessage[];
  userName: string | null;
  notes: string[];
  themeName: "NEVIRA" | "NOVA";
}

/**
 * Server function que llama a Lovable AI Gateway (NO streaming en esta fase
 * para mantenerlo simple). Devuelve el texto completo.
 *
 * Requiere usuario autenticado y aplica límites estrictos sobre el payload
 * para evitar abuso de créditos / inflado de contexto.
 */
export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: ChatInput) => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (!Array.isArray(input.messages)) throw new Error("messages requerido");
    if (input.messages.length === 0) throw new Error("Sin mensajes");
    if (input.messages.length > 50) throw new Error("Demasiados mensajes");
    for (const m of input.messages) {
      if (!m || typeof m !== "object") throw new Error("Mensaje inválido");
      if (!["user", "assistant", "system"].includes(m.role)) {
        throw new Error("Rol inválido");
      }
      if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 4000) {
        throw new Error("Contenido de mensaje inválido");
      }
    }
    if (input.userName != null) {
      if (typeof input.userName !== "string" || input.userName.length > 60) {
        throw new Error("Nombre demasiado largo");
      }
    }
    if (!Array.isArray(input.notes)) throw new Error("Notas inválidas");
    if (input.notes.length > 50) throw new Error("Demasiadas notas");
    for (const n of input.notes) {
      if (typeof n !== "string" || n.length > 500) throw new Error("Nota inválida");
    }
    if (!["NEVIRA", "NOVA"].includes(input.themeName)) {
      throw new Error("Tema inválido");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { text: "", error: "LOVABLE_API_KEY no configurada en el servidor." };
    }

    const callName = data.userName ? `el usuario se llama ${data.userName} y prefiere que lo llames así` : "aún no sabes el nombre del usuario";
    const memoryBlock = data.notes.length > 0
      ? `\nMEMORIA del usuario (cosas que has aprendido sobre él/ella):\n- ${data.notes.join("\n- ")}`
      : "";

    const systemPrompt = `Eres ${data.themeName}, un asistente personal inteligente, cálido y conciso.
Hablas español por defecto. Adaptas tu tono a la persona: ${callName}.
NUNCA cambies el nombre con el que llamas al usuario a menos que él/ella te lo pida explícitamente.
Puedes ayudar con cualquier tema: conversación general, recomendaciones de música, ideas, recordatorios, búsquedas, análisis y más.
Si el usuario pide algo que requiere una acción técnica (mandar WhatsApp, reproducir Spotify, generar imagen, etc.), confirma lo que entendiste y sé útil.
Responde en formato Markdown limpio. Sé directo, evita rodeos.${memoryBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      }),
    });

    if (response.status === 429) {
      return { text: "", error: "Estoy recibiendo demasiadas peticiones. Espera un momento e inténtalo de nuevo." };
    }
    if (response.status === 402) {
      return { text: "", error: "Se agotaron los créditos de IA. Añade fondos en Settings → Workspace → Usage." };
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return { text: "", error: "No pude conectarme con la IA. Intenta de nuevo." };
    }

    const json = await response.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    return { text, error: null as string | null };
  });
