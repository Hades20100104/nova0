import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * Middleware que adjunta el JWT del usuario actual en el header Authorization
 * desde el cliente, y luego ejecuta `requireSupabaseAuth` en el servidor para
 * validarlo. Úsalo en server functions que requieran usuario autenticado.
 */
export const withSupabaseAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .client(async ({ next }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("No has iniciado sesión.");
    }
    return next({
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  });
