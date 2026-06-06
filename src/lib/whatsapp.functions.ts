import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Envía un mensaje de WhatsApp usando Meta Cloud API.
 * Requiere los secrets WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN.
 *
 * IMPORTANTE: Meta solo permite enviar mensajes de texto libre dentro de las
 * 24h posteriores a un mensaje del usuario. Para iniciar una conversación
 * desde cero hay que usar plantillas aprobadas. Esta función intenta texto
 * simple primero — si Meta lo rechaza, el caller verá el error real.
 */
export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      to: z.string().min(6).max(20), // E.164 sin +, p.ej. 521555...
      message: z.string().min(1).max(4000),
    }).parse,
  )
  .handler(async ({ data }) => {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneId || !token) {
      return {
        ok: false as const,
        error:
          "WhatsApp no está configurado (faltan secrets WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN).",
      };
    }
    // Normaliza: solo dígitos
    const to = data.to.replace(/[^0-9]/g, "");
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: data.message },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false as const,
          error: json?.error?.message ?? `Meta API ${res.status}`,
        };
      }
      return { ok: true as const, messageId: json?.messages?.[0]?.id ?? null };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Error desconocido" };
    }
  });
