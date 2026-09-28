import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAssistant } from "@/server/chat.functions";
import { loadMemory, saveMemory, updateMemory, addNote, type AssistantMemory } from "@/lib/memory";
import { detectIntent, normalize } from "@/lib/normalize";
import { Orb } from "@/components/Orb";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatBubble } from "@/components/ChatBubble";
import { QuickActions } from "@/components/QuickActions";
import { Settings2, Lock, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEVIRA & NOVA — Tu asistente inteligente" },
      { name: "description", content: "Asistente personal inteligente con dos modos: NEVIRA (día) y NOVA (noche). Conversa, organiza, busca y crea." },
    ],
  }),
  component: AssistantApp,
});

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
}

function timeNow() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function AssistantApp() {
  const router = useRouter();
  const chatFn = useServerFn(chatWithAssistant);

  const [memory, setMemoryState] = useState<AssistantMemory | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeMenu, setActiveMenu] = useState("home");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar memoria al montar
  useEffect(() => {
    const mem = loadMemory();
    setMemoryState(mem);
    if (!mem.userName) setShowOnboarding(true);
  }, []);

  // Aplicar tema al <html>
  useEffect(() => {
    if (!memory) return;
    const root = document.documentElement;
    root.classList.toggle("nova", memory.theme === "nova");
  }, [memory?.theme]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const themeName: "NEVIRA" | "NOVA" = memory?.theme === "nova" ? "NOVA" : "NEVIRA";
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const handleOnboarding = (name: string) => {
    const mem = updateMemory({ userName: name });
    setMemoryState(mem);
    setShowOnboarding(false);
    setMessages([{
      role: "assistant",
      content: `Encantada, **${name}**. Soy ${themeName}, tu asistente personal. Puedo conversar contigo, ayudarte a organizar tu día, buscar información, generar imágenes, recomendarte música y mucho más. ¿Por dónde empezamos?`,
      time: timeNow(),
    }]);
  };

  const handleThemeChange = (theme: "nevira" | "nova") => {
    const mem = updateMemory({ theme });
    setMemoryState(mem);
  };

  /**
   * Detecta intenciones locales SIN tener que llamar a la IA. Devuelve un
   * mensaje del asistente si maneja la intención localmente, o null si hay
   * que pasarle la consulta al modelo.
   */
  function handleLocalIntent(text: string): string | null {
    const intent = detectIntent(text);
    const t = normalize(text);

    // Cambio de nombre EXPLÍCITO
    if (intent === "rename") {
      // Patrones: "llamame X", "dime X", "mi nombre es X", "cambia mi nombre a X"
      const m = t.match(/(?:llamame|dime|cambia mi nombre a|mi nombre es)\s+([\p{L}\s]{2,30})/u);
      if (m) {
        const newName = m[1].trim().split(" ")[0];
        const capitalized = newName.charAt(0).toUpperCase() + newName.slice(1);
        const mem = updateMemory({ userName: capitalized });
        setMemoryState(mem);
        return `Perfecto, ahora te llamaré **${capitalized}**.`;
      }
    }

    // WhatsApp: "whatsapp a 123 diciendo hola"
    if (intent === "whatsapp") {
      const m = t.match(/(?:whatsapp|wasap|wsp)\s+(?:a\s+)?(\+?\d[\d\s-]{6,})\s+(?:diciendo|que diga|mensaje|:)\s+(.+)/);
      if (m) {
        const phone = m[1].replace(/[\s-]/g, "");
        const body = m[2].trim();
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return `Abrí WhatsApp con un mensaje a **${phone}**: "${body}". Solo dale a enviar 📲`;
      }
      return "Para enviar un WhatsApp dime: *WhatsApp a +52XXXXXXXXXX diciendo hola*.";
    }

    // YouTube
    if (intent === "youtube") {
      const q = text.replace(/.*(?:youtube|busca en youtube)/i, "").trim() || text;
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
      return `Abrí YouTube buscando **${q}** 🎬`;
    }

    // Google
    if (intent === "google") {
      const q = text.replace(/.*(?:busca en google|google|buscar)/i, "").trim() || text;
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
      return `Listo, te abrí Google con **${q}** 🔎`;
    }

    return null;
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || !memory) return;

    const userMsg: UIMessage = { role: "user", content: text, time: timeNow() };
    setMessages((m) => [...m, userMsg]);

    // Intentos locales
    const local = handleLocalIntent(text);
    if (local) {
      setMessages((m) => [...m, { role: "assistant", content: local, time: timeNow() }]);
      return;
    }

    setSending(true);
    try {
      // Guardamos pequeñas notas que la IA puede aprovechar la próxima vez
      const memNow = loadMemory();
      const result = await chatFn({
        data: {
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          userName: memNow.userName,
          notes: memNow.notes,
          themeName,
        },
      });

      if (result.error) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${result.error}`, time: timeNow() }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: result.text, time: timeNow() }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Hubo un error. Intenta de nuevo.", time: timeNow() }]);
      router.invalidate();
    } finally {
      setSending(false);
    }
  };

  if (!memory) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Orb size={120} active variant="nova" />
      </div>
    );
  }

  return (
    <>
      <OnboardingModal open={showOnboarding} themeName={themeName} onSubmit={handleOnboarding} />

      <div className="flex min-h-screen w-full">
        <AppSidebar
          themeName={themeName}
          userName={memory.userName}
          active={activeMenu}
          onSelect={setActiveMenu}
        />

        <main className="flex flex-1 flex-col">
          {/* Topbar */}
          <header className="flex items-center justify-between gap-3 border-b border-border bg-background/40 px-4 py-3 backdrop-blur lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                {greeting}, <span className="text-gradient">{memory.userName ?? "tú"}</span>
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                Modo <span className="font-bold text-foreground">{themeName}</span> activo · Listo para ayudarte.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitch theme={memory.theme} onChange={handleThemeChange} />
              <button
                type="button"
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground hover:text-foreground"
                aria-label="Configuración"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Contenido scrollable */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-6 lg:py-10">
              {/* Hero con orbe (solo si no hay mensajes) */}
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <Orb size={260} active variant={memory.theme} />
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                      Modo <span className="text-gradient">{themeName}</span> activo
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                      {themeName === "NOVA"
                        ? "Listo para ayudarte a lograr cualquier cosa."
                        : "¿En qué puedo ayudarte hoy?"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-4 pb-4">
                  {messages.map((m, i) => (
                    <ChatBubble key={i} message={m} themeName={themeName} />
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 animate-pulse text-primary" />
                      {themeName} está escribiendo…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Composer fijo abajo */}
          <div className="border-t border-border bg-background/60 backdrop-blur">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 lg:py-4">
              <ChatComposer onSend={sendMessage} disabled={sending} />
              {messages.length === 0 && (
                <QuickActions onPick={(p) => sendMessage(p)} />
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Cifrado de extremo a extremo
                </span>
                <span className="hidden sm:inline">
                  {themeName} · Tu asistente inteligente para cada momento.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
