import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeSpotifyCode } from "@/server/spotify.functions";
import { useServerFn } from "@tanstack/react-start";
import { clearSpotifyPkce, getSpotifyPkce, setSpotifyTokens } from "@/lib/spotify-storage";
import { Orb } from "@/components/Orb";

export const Route = createFileRoute("/spotify/callback")({
  head: () => ({
    meta: [{ title: "Conectando Spotify…" }],
  }),
  component: SpotifyCallbackPage,
});

function SpotifyCallbackPage() {
  const navigate = useNavigate();
  const exchangeFn = useServerFn(exchangeSpotifyCode);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Conectando con Spotify…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error");
    const pkce = getSpotifyPkce();
    const verifier = pkce?.verifier ?? null;

    if (errorParam) {
      setStatus("error");
      setMessage(`Spotify rechazó la conexión: ${errorParam}`);
      return;
    }
    if (!code || !verifier) {
      setStatus("error");
      setMessage("Faltan datos de la autorización. Intenta otra vez desde el menú.");
      return;
    }

    const redirectUri = pkce?.redirectUri ?? `${window.location.origin}/spotify/callback`;
    exchangeFn({ data: { code, codeVerifier: verifier, redirectUri } })
      .then((res) => {
        if (res.error || !res.access_token) {
          setStatus("error");
          setMessage(res.error ?? "No se pudo conectar con Spotify.");
          return;
        }
        setSpotifyTokens({
          access_token: res.access_token,
          refresh_token: res.refresh_token ?? null,
          expires_at: Date.now() + (res.expires_in ?? 3600) * 1000,
          spotify_user_id: res.spotify_user_id ?? null,
        });
        clearSpotifyPkce();
        setStatus("ok");
        setMessage("¡Spotify conectado! Volviendo al asistente…");
        setTimeout(() => navigate({ to: "/" }), 800);
      })
      .catch((err) => {
        console.error(err);
        setStatus("error");
        setMessage("Error inesperado conectando con Spotify.");
      });
  }, [exchangeFn, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-bg px-4 text-center">
      <Orb size={140} active variant="nova" />
      <h1 className="text-2xl font-bold">
        {status === "loading" ? "Conectando con Spotify…" : status === "ok" ? "¡Listo!" : "Algo salió mal"}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {status === "error" && (
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Volver al asistente
        </button>
      )}
    </div>
  );
}
