import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music2,
  LogOut,
  LogIn,
  Speaker,
  Smartphone,
  Monitor,
  Tv,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { toast } from "sonner";
import type { SpotifyState } from "@/hooks/use-spotify";

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
}

interface SpotifyPlayerProps {
  state: SpotifyState;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
  onListDevices?: () => Promise<SpotifyDevice[]>;
  onTransfer?: (deviceId: string) => Promise<void>;
}

function deviceIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("speaker")) return Speaker;
  if (t.includes("tv") || t.includes("cast")) return Tv;
  if (t.includes("smartphone") || t.includes("phone")) return Smartphone;
  return Monitor;
}

export function SpotifyPlayer({
  state,
  isAuthenticated,
  onLogin,
  onLogout,
  onToggle,
  onNext,
  onPrev,
  onVolume,
  onListDevices,
  onTransfer,
}: SpotifyPlayerProps) {
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const refreshDevices = async () => {
    if (!onListDevices) return;
    setLoadingDevices(true);
    try {
      const list = await onListDevices();
      setDevices(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No pude listar tus dispositivos.";
      toast.error(msg);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleOpenDevices = async () => {
    const next = !devicesOpen;
    setDevicesOpen(next);
    if (next && devices.length === 0) await refreshDevices();
  };

  const handleTransfer = async (deviceId: string, name: string) => {
    if (!onTransfer) return;
    try {
      await onTransfer(deviceId);
      toast.success(`Reproduciendo en ${name}`);
      await refreshDevices();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No pude transferir la reproducción.";
      toast.error(msg);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border glass p-5 text-center">
        <Music2 className="mx-auto h-8 w-8 text-primary" />
        <h3 className="mt-3 font-semibold">Conecta tu Spotify Premium</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Reproduce música directamente dentro del asistente.
        </p>
        <Button
          onClick={onLogin}
          className="mt-4 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
        >
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
          <div className="truncate text-xs text-muted-foreground">
            {t?.artist ?? (state.ready ? "Pídeme una canción" : "Conectando reproductor…")}
          </div>
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

      {onListDevices && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleOpenDevices}
            className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Speaker className="h-4 w-4" />
              Reproducir en otro dispositivo
            </span>
            <RefreshCw
              className={`h-3 w-3 ${loadingDevices ? "animate-spin" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                void refreshDevices();
              }}
            />
          </button>
          {devicesOpen && (
            <ul className="mt-2 space-y-1">
              {devices.length === 0 && !loadingDevices && (
                <li className="text-xs text-muted-foreground">
                  Abre Spotify en tu otro dispositivo (TV, altavoz, móvil) y refresca.
                </li>
              )}
              {devices.map((d) => {
                const Icon = deviceIcon(d.type);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => handleTransfer(d.id, d.name)}
                      className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${d.is_active ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"}`}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="flex-1 truncate">{d.name}</span>
                      {d.is_active && <span className="text-[10px] text-primary">Activo</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
