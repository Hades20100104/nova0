import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSpotifyAuthUrl, getSpotifyStatus, disconnectSpotify } from "@/lib/spotify.functions";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function SpotifyConnectButton() {
  const status = useServerFn(getSpotifyStatus);
  const auth = useServerFn(getSpotifyAuthUrl);
  const disc = useServerFn(disconnectSpotify);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await status({});
      setConnected(s.connected);
      setName(s.connection?.spotify_display_name ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await auth({ data: { origin: window.location.origin } });
      const w = window.open(url, "spotify-login", "width=520,height=720");
      if (!w) {
        window.location.href = url;
        return;
      }
      // poll for close
      const t = setInterval(() => {
        if (w.closed) {
          clearInterval(t);
          refresh();
        }
      }, 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar Spotify");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disc({});
      toast.success("Spotify desconectado");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al desconectar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando Spotify…
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-medium">Spotify</span>
          {name && <span className="text-muted-foreground">· {name}</span>}
        </div>
        <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy}>
          <LogOut className="h-3.5 w-3.5 mr-1" /> Salir
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={busy}
      className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-medium"
    >
      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
      Conectar con Spotify
    </Button>
  );
}
