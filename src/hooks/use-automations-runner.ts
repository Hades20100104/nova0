import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listAutomations, runAutomation, type Automation } from "@/lib/automations.functions";
import { loadVoicePrefs, speak, createRecognizer, isSttSupported } from "@/lib/voice";

const CHECK_MS = 30_000;

function isDue(a: Automation, now: Date): boolean {
  const t = a.trigger_config as { type?: string; at?: string; minutes?: number };
  const last = a.last_triggered_at ? new Date(a.last_triggered_at) : null;
  if (t?.type === "interval" && t.minutes) {
    return !last || now.getTime() - last.getTime() >= t.minutes * 60_000;
  }
  if (t?.type === "time" && t.at) {
    const [h, m] = t.at.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (now < target) return false;
    return !last || last < target;
  }
  return false;
}

/**
 * Client-side scheduler: checks enabled automations every 30s, runs due ones
 * on the server, and surfaces notifications / voice / navigation.
 * Also listens for voice-triggered automations when the mic is enabled.
 */
export function useAutomationsRunner(enabled: boolean) {
  const qc = useQueryClient();
  const list = useServerFn(listAutomations);
  const run = useServerFn(runAutomation);
  const running = useRef(false);
  const cache = useRef<Automation[]>([]);

  const execute = useRef(async (a: Automation) => {
    try {
      const res = await run({ data: { id: a.id } });
      res.notifications.forEach((n) => toast(`⚙ ${a.name}`, { description: n }));
      if (res.speech.length) {
        const prefs = loadVoicePrefs().nevira;
        if (prefs.enabled) speak(res.speech.join(". "), prefs);
      }
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      toast.error(`Automatización "${a.name}" falló`, {
        description: e instanceof Error ? e.message : "error desconocido",
      });
    }
  });

  // Scheduler loop
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    const tick = async () => {
      if (running.current || stopped) return;
      running.current = true;
      try {
        const { automations } = await list();
        cache.current = automations;
        const now = new Date();
        for (const a of automations) {
          if (!a.enabled) continue;
          if (isDue(a, now)) await execute.current(a);
        }
      } catch {
        /* silencioso: reintenta al siguiente ciclo */
      } finally {
        running.current = false;
      }
    };

    void tick();
    const id = setInterval(tick, CHECK_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [enabled, list]);

  // Voice triggers
  useEffect(() => {
    if (!enabled || !isSttSupported()) return;
    const prefs = loadVoicePrefs().nevira;
    if (!prefs.micEnabled) return;

    let recognizer: ReturnType<typeof createRecognizer> = null;
    let stopped = false;

    const start = () => {
      if (stopped) return;
      recognizer = createRecognizer(
        prefs.lang,
        (text, final) => {
          if (!final) return;
          const spoken = text.toLowerCase();
          const match = cache.current.find((a) => {
            const t = a.trigger_config as { type?: string; phrase?: string };
            return a.enabled && t?.type === "voice" && t.phrase && spoken.includes(t.phrase.toLowerCase());
          });
          if (match) void execute.current(match);
        },
        () => {
          if (!stopped) setTimeout(start, 1500);
        },
      );
      try {
        recognizer?.start();
      } catch {
        /* micrófono ocupado */
      }
    };

    start();
    return () => {
      stopped = true;
      recognizer?.abort();
    };
  }, [enabled]);
}
