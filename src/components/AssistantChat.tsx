import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Send, Mic, MicOff, Sparkles, Cpu, Square, RotateCcw, AlertTriangle, Loader2, Volume2, VolumeX } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getModule, SUGGESTIONS } from "@/lib/modules";
import { toast } from "sonner";
import { useVoicePrefs, speak, stopSpeaking, createRecognizer, isSttSupported } from "@/lib/voice";

export function AssistantChat({
  assistant,
  threadId,
  module,
  initialMessages,
  emptyHint,
}: {
  assistant: "nova" | "nevira";
  threadId: string;
  module: string;
  initialMessages: UIMessage[];
  emptyHint?: string;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { prefs: voice, update: updateVoice } = useVoicePrefs(assistant);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const sttOk = isSttSupported();

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: async ({ messages, id }) => {
      const { data } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      return {
        body: { messages, threadId: id, assistant, module },
        headers,
      };
    },
  });

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Error en el chat"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);

  // Auto-send a pending message stashed by the home dock (liquid chat bar).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialMessages.length > 0) return;
    const key = `pending-msg:${threadId}`;
    const pending = window.sessionStorage.getItem(key);
    if (!pending) return;
    window.sessionStorage.removeItem(key);
    sendMessage({ text: pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // External senders (e.g. per-module chips) can inject messages.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ threadId?: string; text?: string }>).detail;
      if (!detail?.text) return;
      if (detail.threadId && detail.threadId !== threadId) return;
      sendMessage({ text: detail.text });
    };
    window.addEventListener("assistant:send", handler);
    return () => window.removeEventListener("assistant:send", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const isSubmitting = status === "submitted";
  const isStreaming = status === "streaming";
  const isErrored = status === "error" || !!error;
  const isLoading = isSubmitting || isStreaming;

  const mod = getModule(assistant, module);
  const isNevira = assistant === "nevira";
  const suggestions = SUGGESTIONS[module] ?? [];

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    stopSpeaking();
    setInput("");
    await sendMessage({ text: t });
  };

  const retry = async () => {
    try {
      await regenerate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reintentar");
    }
  };

  // Auto-speak finalized assistant messages
  useEffect(() => {
    if (!voice.enabled || isStreaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenIdRef.current === last.id) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (!text.trim()) return;
    lastSpokenIdRef.current = last.id;
    speak(text, voice);
  }, [messages, isStreaming, voice]);

  // Stop speaking on unmount / thread switch
  useEffect(() => () => stopSpeaking(), [threadId]);

  const toggleMic = () => {
    if (!sttOk) { toast.error("Tu navegador no soporta reconocimiento de voz."); return; }
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeaking();
    const rec = createRecognizer(voice.lang, (text, final) => {
      setInput(text);
      if (final) {
        setListening(false);
        recognizerRef.current = null;
        if (text.trim()) void send(text);
      }
    }, () => {
      setListening(false);
      recognizerRef.current = null;
    });
    if (!rec) { toast.error("No se pudo iniciar el micrófono."); return; }
    recognizerRef.current = rec;
    try { rec.start(); setListening(true); }
    catch { setListening(false); toast.error("Permiso de micrófono denegado."); }
  };

  const toggleAutoSpeak = () => {
    if (voice.enabled) stopSpeaking();
    updateVoice({ enabled: !voice.enabled });
  };


  const StatusBadge = () => {
    if (isErrored) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.25em] text-destructive font-mono">
          <AlertTriangle className="h-3 w-3" /> error
        </span>
      );
    }
    if (isSubmitting) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.25em] text-primary font-mono">
          <Loader2 className="h-3 w-3 animate-spin" /> enviando
        </span>
      );
    }
    if (isStreaming) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.25em] text-primary font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> transmitiendo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" /> en línea
      </span>
    );
  };

  const AvatarBadge = () => (
    <div className="shrink-0">
      {isNevira ? (
        <div className="relative flex h-9 w-9 items-center justify-center rounded-md border border-primary/50 bg-card/70 font-mono text-[10px] tracking-widest text-primary glow-ring">
          <Cpu className="h-4 w-4" />
        </div>
      ) : (
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground glow-ring">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl text-center pt-12 fade-up">
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-mono">
              {isNevira ? `MÓDULO // ${mod.label.toUpperCase()}` : `· ${mod.label} ·`}
            </div>
            <h2 className="mt-3 font-display text-3xl glow-text">{emptyHint ?? mod.description}</h2>
            <p className="mt-3 text-muted-foreground text-sm">{mod.systemPrompt}</p>
            {suggestions.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className={`group rounded-full border px-3.5 py-1.5 text-xs transition hover:bg-primary/15 hover:scale-[1.02] ${
                      isNevira
                        ? "border-primary/40 bg-card/60 font-mono tracking-wide"
                        : "border-primary/30 bg-card/40 backdrop-blur"
                    }`}
                  >
                    {isNevira && <span className="text-primary mr-1.5">›</span>}
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end gap-2 fade-up">
                  <div className={`max-w-[80%] whitespace-pre-wrap px-4 py-2.5 ${
                    isNevira
                      ? "rounded-md border border-primary/40 bg-primary/15 font-mono text-sm"
                      : "rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground"
                  }`}>
                    {text}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex gap-3 fade-up">
                <AvatarBadge />
                <div className={`flex-1 ${
                  isNevira
                    ? "rounded-md border border-border/50 bg-card/40 p-4 font-mono text-sm leading-relaxed"
                    : "assistant-prose text-foreground/90"
                }`}>
                  {isNevira && (
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80">
                      <span className="inline-block h-1 w-1 rounded-full bg-primary animate-pulse" />
                      NEVIRA · {mod.label}
                    </div>
                  )}
                  {m.parts.map((p, i) => {
                    if (p.type === "text") {
                      return <div key={i} className="assistant-prose"><ReactMarkdown>{p.text}</ReactMarkdown></div>;
                    }
                    if (typeof p.type === "string" && p.type.startsWith("tool-")) {
                      const toolName = p.type.replace(/^tool-/, "");
                      const part = p as unknown as { state?: string; output?: unknown; errorText?: string };
                      const state = part.state ?? "";
                      const output = part.output as { ok?: boolean; url?: string; error?: string; tracks?: Array<{title:string;artist:string;url:string;cover?:string}>; memories?: Array<{key:string;value:string}>; id?: string; title?: string; contact?: string } | undefined;
                      return (
                        <div key={i} className="my-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 font-mono uppercase tracking-widest text-[10px] text-primary/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            herramienta · {toolName}
                            {state && <span className="text-muted-foreground">· {state}</span>}
                          </div>
                          {output?.error && <div className="mt-1 text-destructive">{output.error}</div>}
                          {toolName === "generate_image" && output?.url && (
                            <img src={output.url} alt="" className="mt-2 max-h-80 rounded-md border border-primary/30" />
                          )}
                          {toolName === "search_music" && output?.tracks && (
                            <ul className="mt-1 space-y-1">
                              {output.tracks.map((t, j) => (
                                <li key={j} className="flex items-center gap-2">
                                  {t.cover && <img src={t.cover} alt="" className="h-8 w-8 rounded" />}
                                  <a href={t.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{t.title}</a>
                                  <span className="text-muted-foreground truncate">— {t.artist}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {toolName === "recall" && output?.memories && (
                            <ul className="mt-1 space-y-0.5">
                              {output.memories.map((mm, j) => (
                                <li key={j}><span className="text-primary">{mm.key}:</span> {mm.value}</li>
                              ))}
                            </ul>
                          )}
                          {toolName === "remember" && output?.ok && <div className="mt-1 text-emerald-400">Guardado ✓</div>}
                          {toolName === "save_document" && output?.ok && <div className="mt-1 text-emerald-400">Documento guardado: {output.title}</div>}
                          {toolName === "send_whatsapp" && output?.ok && <div className="mt-1 text-emerald-400">Mensaje enviado a {output.contact}</div>}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}
          {isSubmitting && (
            <div className="flex items-center gap-3 text-muted-foreground italic fade-up">
              <AvatarBadge />
              <span className="font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isNevira ? "PROCESANDO ▌" : "NOVA está pensando…"}
              </span>
            </div>
          )}
          {isErrored && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 fade-up">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono uppercase tracking-[0.25em] text-destructive">
                  Fallo en la transmisión
                </div>
                <div className="mt-1 text-sm text-foreground/80 break-words">
                  {error?.message ?? "Ocurrió un error al obtener la respuesta."}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={retry} className="h-8">
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reintentar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/40 p-4">
        <div className="mx-auto max-w-3xl mb-2 flex items-center justify-between gap-2 px-1">
          <StatusBadge />
          {isStreaming && (
            <button
              onClick={() => stop()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground hover:border-primary/50 transition font-mono"
            >
              <Square className="h-3 w-3" /> detener
            </button>
          )}
          {isErrored && !isLoading && (
            <button
              onClick={retry}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-primary hover:bg-primary/20 transition font-mono"
            >
              <RotateCcw className="h-3 w-3" /> reintentar
            </button>
          )}
        </div>
        <div className={`mx-auto max-w-3xl flex items-end gap-2 p-2 glow-ring ${
          isNevira
            ? "rounded-md border border-primary/40 bg-card/60 backdrop-blur"
            : "glass rounded-2xl border border-border/40"
        }`}>
          {isNevira && <span className="pl-2 text-primary font-mono text-sm select-none">›_</span>}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder={isNevira ? `> consultar en ${mod.label.toLowerCase()}…` : "¿Qué deseas crear hoy?"}
            rows={1}
            className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none"
            disabled={isLoading}
          />
          <Button
            variant="ghost" size="icon" type="button"
            onClick={toggleAutoSpeak}
            className={voice.enabled ? "text-primary" : "text-muted-foreground"}
            title={voice.enabled ? "Silenciar respuestas" : "Activar voz"}
          >
            {voice.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon" type="button"
            onClick={toggleMic}
            disabled={!sttOk || isLoading}
            className={listening ? "text-destructive animate-pulse" : (sttOk ? "text-primary" : "text-muted-foreground")}
            title={listening ? "Detener micrófono" : (sttOk ? "Hablar" : "Micrófono no soportado")}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {isLoading ? (
            <Button onClick={() => stop()} size="icon" variant="destructive" title="Detener">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => send(input)} disabled={!input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
          {isNevira ? "ENTER para enviar · SHIFT+ENTER nueva línea" : "Pulsa Enter para enviar · Shift+Enter nueva línea"}
        </p>
      </div>
    </div>
  );
}
