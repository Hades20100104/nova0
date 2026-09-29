import { useRef, useState } from "react";
import { Mic, Paperclip, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Attachment = { name: string; url: string; mime: string };

type Props = {
  assistant: "nova" | "nevira";
  placeholder?: string;
  onSubmit: (text: string) => void | Promise<void>;
};

export function LiquidChatBar({ assistant, placeholder, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) { toast.error("Inicia sesión para adjuntar"); return; }
    setUploading(true);
    try {
      const added: Attachment[] = [];
      for (const file of Array.from(files).slice(0, 5)) {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} > 20MB`); continue; }
        const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
        const up = await supabase.storage
          .from("chat-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) { toast.error(up.error.message); continue; }
        const { data } = await supabase.storage
          .from("chat-attachments")
          .createSignedUrl(path, 60 * 60 * 24);
        if (data?.signedUrl) added.push({ name: file.name, url: data.signedUrl, mime: file.type });
      }
      setAttachments((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    const t = value.trim();
    if ((!t && !attachments.length) || busy) return;
    setBusy(true);
    const attText = attachments.length
      ? "\n\nAdjuntos:\n" + attachments.map((a) => `- [${a.name}](${a.url})`).join("\n")
      : "";
    const finalText = (t || "(adjuntos)") + attText;
    setValue("");
    setAttachments([]);
    try { await onSubmit(finalText); } finally { setBusy(false); }
  };

  const isNova = assistant === "nova";
  return (
    <div className="px-3 md:px-6 pb-3 md:pb-5 pt-2">
      {attachments.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[11px]">
              {a.mime.startsWith("image/") ? (
                <img src={a.url} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        ref={ref}
        onMouseMove={onMove}
        className="liquid-glass mx-auto flex w-full max-w-3xl items-center gap-2 md:gap-3 px-2 md:px-3 py-2"
        style={{ borderRadius: 999 }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
          accept="image/*,application/pdf,.txt,.md,.docx,.xlsx,.pptx,.csv,.json"
        />
        <button
          type="button"
          title="Adjuntar archivo"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="grid h-10 w-10 md:h-11 md:w-11 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary shrink-0 transition hover:bg-primary/20 disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4 md:h-[18px] md:w-[18px]" />
        </button>

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
          placeholder={placeholder ?? (isNova ? "Escribe, habla o adjunta a NOVA…" : "Consulta o adjunta a NEVIRA…")}
          disabled={busy}
          className="flex-1 min-w-0 bg-transparent text-sm md:text-base placeholder:text-foreground/45 outline-none px-1 py-2 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={send}
          disabled={busy || (!value.trim() && !attachments.length)}
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
