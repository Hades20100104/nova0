import { useRef, useState } from "react";
import { Mic, Send } from "lucide-react";

type Props = {
  assistant: "nova" | "nevira";
  placeholder?: string;
  onSubmit: (text: string) => void | Promise<void>;
};

export function LiquidChatBar({ assistant, placeholder, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const send = async () => {
    const t = value.trim();
    if (!t || busy) return;
    setBusy(true);
    setValue("");
    try { await onSubmit(t); } finally { setBusy(false); }
  };

  const isNova = assistant === "nova";
  return (
    <div className="px-3 md:px-6 pb-3 md:pb-5 pt-2">
      <div
        ref={ref}
        onMouseMove={onMove}
        className="liquid-glass mx-auto flex w-full max-w-3xl items-center gap-2 md:gap-3 px-2 md:px-3 py-2"
        style={{ borderRadius: 999 }}
      >
        <button
          type="button"
          title="Voz (próximamente)"
          className="relative grid h-10 w-10 md:h-11 md:w-11 place-items-center rounded-full border border-primary/50 bg-primary/15 text-primary shrink-0 transition hover:bg-primary/25"
          style={{ boxShadow: "0 0 18px var(--glow), inset 0 0 12px color-mix(in oklab, var(--glow) 35%, transparent)" }}
        >
          <Mic className="h-4 w-4 md:h-[18px] md:w-[18px]" />
          <span className="absolute inset-0 rounded-full ring-1 ring-primary/30 animate-pulse pointer-events-none" />
        </button>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          placeholder={placeholder ?? (isNova ? "Escribe o habla con NOVA…" : "Consulta a NEVIRA…")}
          disabled={busy}
          className="flex-1 min-w-0 bg-transparent text-sm md:text-base placeholder:text-foreground/45 outline-none px-1 py-2 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={send}
          disabled={busy || !value.trim()}
          aria-label="Enviar"
          className="grid h-10 w-10 md:h-11 md:w-11 place-items-center rounded-full border border-primary/60 bg-primary/25 text-foreground shrink-0 transition hover:bg-primary/40 disabled:opacity-40 disabled:hover:bg-primary/25"
          style={{ boxShadow: "0 0 18px var(--glow)" }}
        >
          <Send className="h-4 w-4 md:h-[18px] md:w-[18px]" />
        </button>
      </div>
    </div>
  );
}
