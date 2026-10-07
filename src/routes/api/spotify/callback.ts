import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function verifyState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, nonce, sig] = parts;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback";
  const expected = createHmac("sha256", secret)
    .update(`${userId}.${nonce}`)
    .digest("hex")
    .slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return userId;
}

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Spotify</title>
    <style>body{font-family:system-ui;background:#0a0a0f;color:#e5e7eb;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px}
    .card{max-width:420px;border:1px solid #1f2937;background:#11131a;padding:24px;border-radius:16px;box-shadow:0 0 40px rgba(99,102,241,.2)}
    h1{margin:0 0 8px;font-size:18px;letter-spacing:.2em;text-transform:uppercase}
    p{color:#9ca3af;margin:0 0 16px}
    a{color:#a78bfa;text-decoration:none}</style></head>
    <body><div class="card">${body}</div>
    <script>setTimeout(()=>{try{window.close()}catch(e){}},1500);</script>
    </body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        if (errorParam) return html(`<h1>Spotify</h1><p>Acceso denegado: ${errorParam}</p>`, 400);
        if (!code || !state) return html(`<h1>Spotify</h1><p>Parámetros faltantes.</p>`, 400);

        const userId = verifyState(state);
        if (!userId) return html(`<h1>Spotify</h1><p>Estado inválido.</p>`, 400);

        const clientId = process.env.SPOTIFY_CLIENT_ID!;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
        const redirectUri =
          process.env.SPOTIFY_REDIRECT_URI ?? `${url.origin}/api/spotify/callback`;

        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokRes = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }).toString(),
        });
        if (!tokRes.ok) {
          const t = await tokRes.text();
          return html(`<h1>Spotify</h1><p>Error de token: ${t.slice(0, 200)}</p>`, 400);
        }
        const tok = (await tokRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope: string;
        };

        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        const me = meRes.ok
          ? ((await meRes.json()) as { id?: string; display_name?: string })
          : { id: undefined, display_name: undefined };

        const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("spotify_connections")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const row = {
          user_id: userId,
          access_token: tok.access_token,
          refresh_token: tok.refresh_token ?? null,
          expires_at: expiresAt,
          scopes: tok.scope.split(" "),
          spotify_user_id: me.id ?? null,
          spotify_display_name: me.display_name ?? null,
        };

        if (existing) {
          await supabaseAdmin
            .from("spotify_connections")
            .update(row)
            .eq("id", existing.id);
        } else {
          await supabaseAdmin.from("spotify_connections").insert(row);
        }

        return html(
          `<h1>Spotify conectado ✓</h1><p>Bienvenido, ${me.display_name ?? "usuario"}. Puedes cerrar esta ventana.</p>`,
        );
      },
    },
  },
});
