import { Play, Pause, SkipBack, SkipForward, Music2, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SpotifyState } from "@/hooks/use-spotify";

interface SpotifyPlayerProps {
  state: SpotifyState;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
}

export function SpotifyPlayer({ state, isAuthenticated, onLogin, onLogout, onToggle, onNext, onPrev, onVolume }: SpotifyPlayerProps) {
  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border glass p-5 text-center">
        <Music2 className="mx-auto h-8 w-8 text-primary" />
        <h3 className="mt-3 font-semibold">Conecta tu Spotify Premium</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Reproduce música directamente dentro del asistente.
        </p>
        <Button onClick={onLogin} className="mt-4 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <LogIn className="mr-2 h-4 w-4" /> Conectar Spotify
        </Button>
      </div>
    );
  }

  const t = state.current;

  return (
    <div className="rounded-2xl border border-border glass p-4">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {t?.cover ? (
            <img src={t.cover} alt={t.album} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{t?.name ?? "Sin reproducción"}</div>
          <div className="truncate text-xs text-muted-foreground">{t?.artist ?? (state.ready ? "Pídeme una canción" : "Conectando reproductor…")}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Desconectar Spotify">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={!state.ready}>
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          onClick={onToggle}
          disabled={!state.ready}
          className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground"
        >
          {state.paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={!state.ready}>
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-3 px-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Volumen</div>
        <Slider
          defaultValue={[60]}
          max={100}
          step={1}
          onValueChange={(v) => onVolume((v[0] ?? 0) / 100)}
          className="mt-1"
        />
      </div>
    </div>
  );
}
