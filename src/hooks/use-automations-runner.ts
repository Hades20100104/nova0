import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  type Automation,
  type GeofenceConfig,
  type TimeConfig,
  type WhatsAppActionConfig,
  type SpotifyActionConfig,
  type NotificationActionConfig,
  distanceMeters,
  markTriggered,
} from "@/lib/automations";
import { sendWhatsAppMessage } from "@/lib/whatsapp.functions";
import { toast } from "sonner";
import { getCurrentPosition, isNative, notifyLocal } from "@/lib/native";

interface RunnerOptions {
  automations: Automation[];
  /** Callback opcional para reproducir música cuando un trigger lo pida. */
  onSpotifyPlay?: (query: string) => Promise<void> | void;
}

/**
 * Evalúa automatizaciones activas cada 15s usando la geolocalización del
 * navegador y la hora local. Mientras la app esté abierta, dispara las
 * acciones configuradas (WhatsApp, Spotify, notificación).
 *
 * Limitación: si la app se cierra, no hay disparos en background. Para eso
 * habría que usar un cron del servidor + push, fuera de este alcance.
 */
export function useAutomationsRunner({ automations, onSpotifyPlay }: RunnerOptions) {
  const sendWhats = useServerFn(sendWhatsAppMessage);
  const lastFireRef = useRef<Record<string, number>>({});
  const insideRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (automations.length === 0) return;
    let cancelled = false;

    const fire = async (a: Automation) => {
      // throttle: no disparar el mismo más de 1 vez por minuto en cliente
      const now = Date.now();
      if (now - (lastFireRef.current[a.id] ?? 0) < 60_000) return;
      lastFireRef.current[a.id] = now;
      try {
        if (a.action_type === "whatsapp") {
          const cfg = a.action_config as WhatsAppActionConfig;
          const res = await sendWhats({ data: { to: cfg.to, message: cfg.message } });
          if (res.ok) {
            toast.success(`WhatsApp enviado a ${cfg.contactName ?? cfg.to}`);
          } else {
            toast.error(`WhatsApp falló: ${res.error}`);
          }
        } else if (a.action_type === "spotify") {
          const cfg = a.action_config as SpotifyActionConfig;
          if (onSpotifyPlay) {
            await onSpotifyPlay(cfg.query);
            toast.success(`Reproduciendo: ${cfg.query}`);
          }
        } else if (a.action_type === "notification") {
          const cfg = a.action_config as NotificationActionConfig;
          if (isNative()) {
            await notifyLocal(a.name, cfg.text);
          } else {
            toast.message(cfg.text);
          }
        }
        await markTriggered(a.id, "fired").catch(() => {});
      } catch (e) {
        console.error("automation fire", e);
      }
    };

    const evalTime = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const current = `${hh}:${mm}`;
      const dow = now.getDay();
      for (const a of automations) {
        if (!a.enabled || a.trigger_type !== "time") continue;
        const cfg = a.trigger_config as TimeConfig;
        if (cfg.time === current && (cfg.days.length === 0 || cfg.days.includes(dow))) {
          void fire(a);
        }
      }
    };

    const evalGeo = (pos: GeolocationPosition) => {
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      for (const a of automations) {
        if (!a.enabled) continue;
        if (a.trigger_type !== "geofence_enter" && a.trigger_type !== "geofence_exit") continue;
        const cfg = a.trigger_config as GeofenceConfig;
        const dist = distanceMeters(me, { lat: cfg.lat, lng: cfg.lng });
        const inside = dist <= cfg.radiusM;
        const wasInside = insideRef.current[a.id] ?? null;
        insideRef.current[a.id] = inside;
        if (wasInside === null) continue; // primera lectura, no disparar
        if (a.trigger_type === "geofence_enter" && !wasInside && inside) void fire(a);
        if (a.trigger_type === "geofence_exit" && wasInside && !inside) void fire(a);
      }
    };

    const tick = async () => {
      if (cancelled) return;
      evalTime();
      if (automations.some((a) => a.trigger_type !== "time")) {
        const pos = await getCurrentPosition();
        if (pos && !cancelled) {
          evalGeo({ coords: { latitude: pos.lat, longitude: pos.lng } } as GeolocationPosition);
        }
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [automations, onSpotifyPlay, sendWhats]);
}
