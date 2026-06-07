import { useMemo } from "react";
import { useVoicePrefs, useVoices, isTtsSupported, isSttSupported, speak, stopSpeaking, type Assistant } from "@/lib/voice";
import { Mic, Volume2, Waves, Play, Square } from "lucide-react";

const JARVIS_PRESETS: Record<Assistant, { rate: number; pitch: number; sample: string }> = {
  nova: { rate: 1.0, pitch: 1.05, sample: "Hola. Soy Nova. ¿Qué deseas crear hoy?" },
  nevira: { rate: 0.95, pitch: 0.85, sample: "Sistema en línea. Nevira a tu servicio." },
};

export function VoiceSettings({ assistant }: { assistant: Assistant }) {
  const { prefs, update } = useVoicePrefs(assistant);
  const voices = useVoices();
  const ttsOk = isTtsSupported();
  const sttOk = isSttSupported();

  const grouped = useMemo(() => {
    const langPrefix = prefs.lang.split("-")[0];
    const preferred = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
    const others = voices.filter((v) => !v.lang.toLowerCase().startsWith(langPrefix));
    return [...preferred, ...others];
  }, [voices, prefs.lang]);

  const preview = () => speak(JARVIS_PRESETS[assistant].sample, prefs);

  const applyPreset = (preset: "jarvis" | "natural" | "fast") => {
    if (preset === "jarvis") update({ rate: JARVIS_PRESETS[assistant].rate, pitch: JARVIS_PRESETS[assistant].pitch });
    if (preset === "natural") update({ rate: 1, pitch: 1 });
    if (preset === "fast") update({ rate: 1.25, pitch: assistant === "nevira" ? 0.9 : 1.05 });
  };

  if (!ttsOk) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        Tu navegador no soporta síntesis de voz (Web Speech API).
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Toggle
          icon={<Volume2 className="h-4 w-4" />}
          label="Leer respuestas en voz alta"
          desc="El asistente habla cada respuesta automáticamente."
          value={prefs.enabled}
          onChange={(v) => update({ enabled: v })}
        />
        <Toggle
          icon={<Mic className="h-4 w-4" />}
          label="Entrada por micrófono"
          desc={sttOk ? "Habla para dictar tus mensajes." : "No soportado en este navegador."}
          value={prefs.micEnabled && sttOk}
          disabled={!sttOk}
          onChange={(v) => update({ micEnabled: v })}
        />
      </div>

      {/* Presets */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
          <Waves className="h-3.5 w-3.5" /> Tono preestablecido
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "jarvis", label: assistant === "nevira" ? "JARVIS · grave" : "JARVIS · cálido" },
            { id: "natural", label: "Natural" },
            { id: "fast", label: "Rápido" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id as "jarvis" | "natural" | "fast")}
              className="rounded-full border border-primary/40 bg-card/50 px-3 py-1.5 text-xs hover:bg-primary/15 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice selector */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">Voz del sistema</div>
        <select
          value={prefs.voiceURI ?? ""}
          onChange={(e) => update({ voiceURI: e.target.value || null })}
          className="w-full rounded-md border border-primary/30 bg-card/60 px-3 py-2 text-sm"
        >
          <option value="">Predeterminada del navegador</option>
          {grouped.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} — {v.lang}
            </option>
          ))}
        </select>
      </div>

      {/* Lang */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">Idioma</div>
        <select
          value={prefs.lang}
          onChange={(e) => update({ lang: e.target.value })}
          className="w-full rounded-md border border-primary/30 bg-card/60 px-3 py-2 text-sm"
        >
          {["es-ES", "es-MX", "es-AR", "en-US", "en-GB", "fr-FR", "pt-BR", "it-IT", "de-DE"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Sliders */}
      <Slider label="Velocidad" value={prefs.rate} min={0.5} max={2} step={0.05}
        onChange={(v) => update({ rate: v })} format={(v) => `${v.toFixed(2)}x`} />
      <Slider label="Tono" value={prefs.pitch} min={0} max={2} step={0.05}
        onChange={(v) => update({ pitch: v })} format={(v) => v.toFixed(2)} />
      <Slider label="Volumen" value={prefs.volume} min={0} max={1} step={0.05}
        onChange={(v) => update({ volume: v })} format={(v) => `${Math.round(v * 100)}%`} />

      <div className="flex items-center gap-2 pt-2">
        <button onClick={preview}
          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-xs uppercase tracking-[0.25em] font-mono hover:bg-primary/25 transition">
          <Play className="h-3.5 w-3.5" /> Probar voz
        </button>
        <button onClick={stopSpeaking}
          className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/40 px-4 py-2 text-xs uppercase tracking-[0.25em] font-mono hover:bg-primary/10 transition">
          <Square className="h-3.5 w-3.5" /> Detener
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
        Las voces dependen del navegador y del sistema. En macOS / iOS prueba “Mónica” o “Paulina” para un acento natural.
      </p>
    </div>
  );
}

function Toggle({ icon, label, desc, value, onChange, disabled }: {
  icon: React.ReactNode; label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      data-active={value}
      disabled={disabled}
      className={`text-left rounded-lg border px-3 py-2.5 transition ${
        value ? "border-primary bg-primary/15" : "border-primary/25 bg-card/40 hover:bg-primary/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center gap-2 text-sm">{icon} {label}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-[0.3em] font-mono">
        <span className="text-primary/80">{label}</span>
        <span className="text-muted-foreground">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--primary)]" />
    </div>
  );
}
