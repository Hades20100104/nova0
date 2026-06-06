import { FileText, Upload, Mic, StickyNote, Calculator, Languages, Code2, X } from "lucide-react";
import { Waveform } from "./Waveform";

const ITEMS = [
  { icon: FileText, label: "Nuevo Doc." },
  { icon: Upload, label: "Subir Archivo" },
  { icon: Mic, label: "Grabar Voz" },
  { icon: StickyNote, label: "Nota Rápida" },
  { icon: Calculator, label: "Calculadora" },
  { icon: Languages, label: "Traductor" },
  { icon: Code2, label: "Código IA" },
];

export function QuickAccessBar() {
  return (
    <div className="holo-dock relative">
      <span className="holo-dock-tether" />
      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-5">

        <div className="flex-1 min-w-0">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Acceso Rápido
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
            {ITEMS.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.label}
                  className="group flex shrink-0 flex-col items-center gap-1 rounded-lg border border-border/40 bg-background/40 px-3 py-2 transition hover:border-primary hover:bg-primary/10"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] text-foreground/80 whitespace-nowrap">{it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="hidden md:block w-64 shrink-0">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Ejecución de Sistemas
            </span>
            <button className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[10px] text-foreground/70 mb-1">
            Todos los módulos funcionando correctamente.
          </div>
          <Waveform bars={48} color="var(--primary)" />
        </div>
      </div>
    </div>
  );
}
