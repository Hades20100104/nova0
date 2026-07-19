import { useState } from "react";
import {
  NOVA_THEMES, NEVIRA_THEMES, FONT_PRESETS, useTheme,
} from "@/lib/theme";
import { Check, Palette, Type } from "lucide-react";
import { VoiceSettings } from "./VoiceSettings";

export function ThemeSettings({ assistant }: { assistant: "nova" | "nevira" }) {
  const { prefs, update } = useTheme();
  const themes = assistant === "nova" ? NOVA_THEMES : NEVIRA_THEMES;
  const current = assistant === "nova" ? prefs.nova : prefs.nevira;
  const setTheme = (id: string) =>
    assistant === "nova" ? update({ nova: id as any }) : update({ nevira: id as any });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
          <Palette className="h-3.5 w-3.5" /> Paleta visual de {assistant.toUpperCase()}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              data-active={current === t.id}
              className="swatch-btn"
              style={{ background: t.swatch }}
              aria-label={t.label}
            >
              <span className="swatch-label">{t.label}</span>
              {current === t.id && (
                <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/80 border border-primary">
                  <Check className="h-3 w-3 text-primary" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
          <Type className="h-3.5 w-3.5" /> Tipografía display
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FONT_PRESETS.map((f) => (
            <button
              key={f.id}
              onClick={() => update({ font: f.id })}
              data-active={prefs.font === f.id}
              className={`swatch-btn flex items-center justify-center text-2xl ${
                f.id === "sora"   ? "font-pref-sora"   :
                f.id === "outfit" ? "font-pref-outfit" :
                f.id === "serif"  ? "font-pref-serif"  : "font-pref-mono"
              }`}
              style={{ background: "color-mix(in oklab, var(--card) 80%, transparent)" }}
            >
              <span style={{ fontFamily: "var(--font-display)" }} className="glow-text">{f.sample}</span>
              <span className="swatch-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-primary/25 bg-card/40 p-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
          Intensidad visual
        </div>
        <label className="block space-y-1">
          <div className="flex justify-between text-xs">
            <span>Glow</span><span className="font-mono">{prefs.glow}%</span>
          </div>
          <input type="range" min={0} max={100} value={prefs.glow}
            onChange={(e) => update({ glow: Number(e.target.value) })}
            className="w-full accent-primary" />
        </label>
        <label className="block space-y-1">
          <div className="flex justify-between text-xs">
            <span>Animación</span><span className="font-mono">{prefs.animation}%</span>
          </div>
          <input type="range" min={0} max={100} value={prefs.animation}
            onChange={(e) => update({ animation: Number(e.target.value) })}
            className="w-full accent-primary" />
        </label>
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
        Los cambios se guardan en este dispositivo y se aplican a NOVA y NEVIRA al instante.
      </p>
    </div>
  );
}

// Wrapper used in Ajustes section content
export function AjustesPanel({ assistant }: { assistant: "nova" | "nevira" }) {
  const [tab, setTab] = useState<"tema" | "voz" | "asistente">("tema");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] font-mono">
        {[
          { id: "tema",       label: "Tema y Tipografía" },
          { id: "voz",        label: "Voz" },
          { id: "asistente",  label: "Asistente" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "tema" | "voz" | "asistente")}
            className={`px-3 py-1.5 rounded-full border transition ${
              tab === t.id
                ? "border-primary bg-primary/25 glow-text"
                : "border-primary/30 bg-card/40 hover:bg-primary/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "tema" && <ThemeSettings assistant={assistant} />}
      {tab === "voz" && <VoiceSettings assistant={assistant} />}
      {tab === "asistente" && (
        <div className="space-y-3 text-sm">
          {["Tono", "Idioma", "Voz", "Memoria", "Notificaciones"].map((s) => (
            <div key={s} className="flex items-center justify-between rounded-lg border border-primary/25 bg-card/40 px-3 py-2">
              <span>{s}</span>
              <span className="text-[10px] uppercase tracking-widest text-primary">Personalizar</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
