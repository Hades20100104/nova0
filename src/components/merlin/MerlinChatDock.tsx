import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { merlinChat } from "@/lib/merlin.functions";
import { LEARN_MODES } from "@/lib/merlin";
import { Loader2, Send } from "lucide-react";

export function MerlinChatDock({ section }: { section: string }) {
  const fn = useServerFn(merlinChat);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("aprender");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = msgs.slice(-6);
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const r = await fn({ data: { message: text, section, mode, history } });
      setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "No pude responder ahora mismo. Intenta de nuevo." }]);
    } finally {
      setBusy(false);
      setOpen(true);
    }
  };

  return (
    <div className="border-t border-primary/20 bg-background/50 backdrop-blur-xl">
      {open && msgs.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto px-4 py-3">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto border-primary/40 bg-primary/10" : "border-border/40 bg-background/60"}`}>
              {m.content}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 p-3">
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-border/50 bg-background/60 px-2 py-2 text-xs">
          {LEARN_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Pregúntale a Merlin (${section})…`}
          className="flex-1 rounded-xl border border-primary/30 bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/70"
        />
        <button onClick={send} aria-label="Enviar" className="grid h-10 w-10 place-items-center rounded-xl border border-primary/50 bg-primary/15 hover:bg-primary/25 transition">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
        {msgs.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">
            {open ? "ocultar" : "ver chat"}
          </button>
        )}
      </div>
    </div>
  );
}
