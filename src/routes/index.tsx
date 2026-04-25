import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAssistant } from "@/server/chat.functions";
import { generateImage } from "@/server/image.functions";
import { extractMemoryNote } from "@/server/memory.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/use-auth";
import { fetchProfile, updateProfile, fetchNotes, addNote, clearNotes } from "@/lib/cloud-memory";
import { useSpotify } from "@/hooks/use-spotify";
import { detectIntent, normalize } from "@/lib/normalize";
import { Orb } from "@/components/Orb";
import { SoundWaves } from "@/components/SoundWaves";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatBubble } from "@/components/ChatBubble";
import { QuickActions } from "@/components/QuickActions";
import { MenuDrawer } from "@/components/MenuDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { SpotifyPlayer } from "@/components/SpotifyPlayer";
import { WhatsAppConfirm } from "@/components/WhatsAppConfirm";
import { ImageMessage } from "@/components/ImageMessage";
import { Menu, Activity, Lock, LayoutPanelLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchContacts, findContactByName, type WhatsAppContact } from "@/lib/contacts";
import type { NeviraColor, NovaColor } from "@/lib/cloud-memory";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "NEVIRA & NOVA — Tu asistente inteligente" },
      { name: "description", content: "Asistente personal con dos modos: NEVIRA (día) y NOVA (noche). Música, imágenes, WhatsApp y más." },
    ],
  }),
  component: AssistantApp,
});

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
  /** Mensaje especial: tarjeta de WhatsApp pendiente de confirmación */
  whatsapp?: { phone: string; message: string; sent: boolean };
  /** Mensaje especial: imagen generada */
  image?: { prompt: string; url: string | null };
}

function timeNow() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function AssistantApp() {
  const router = useRouter();
  const auth = useAuth();
  const chatFn = useServerFn(chatWithAssistant);
  const imageFn = useServerFn(generateImage);
  const memoryFn = useServerFn(extractMemoryNote);

  const [profile, setProfile] = useState<{ assistantName: string | null; theme: "nevira" | "nova"; neviraColor: NeviraColor; novaColor: NovaColor } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeMenu, setActiveMenu] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"menu" | "playlists" | "playlist-detail" | "contacts" | "docs">("menu");
  const [showPlayer, setShowPlayer] = useState(false);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const spotify = useSpotify(!!auth.user, auth.user?.id ?? null);

  // Cargar perfil + memoria + contactos
  useEffect(() => {
    if (!auth.user) return;
    (async () => {
      const p = await fetchProfile(auth.user!.id);
      const n = await fetchNotes(auth.user!.id);
      const c = await fetchContacts(auth.user!.id);
      setProfile({
        assistantName: p?.assistant_name ?? null,
        theme: (p?.theme as "nevira" | "nova") ?? "nevira",
        neviraColor: (p?.nevira_color as NeviraColor) ?? "aqua",
        novaColor: (p?.nova_color as NovaColor) ?? "violet",
      });
      setNotes(n);
      setContacts(c);
      if (!p?.assistant_name) setShowOnboarding(true);
    })();
  }, [auth.user]);

  // Aplicar tema y color al <html>
  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    root.classList.toggle("nova", profile.theme === "nova");
    // Limpiar variantes anteriores
    root.classList.forEach((c) => {
      if (c.startsWith("nevira-") || c.startsWith("nova-")) root.classList.remove(c);
    });
    if (profile.theme === "nova") {
      root.classList.add(`nova-${profile.novaColor}`);
    } else {
      root.classList.add(`nevira-${profile.neviraColor}`);
    }
  }, [profile?.theme, profile?.neviraColor, profile?.novaColor]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const themeName: "NEVIRA" | "NOVA" = profile?.theme === "nova" ? "NOVA" : "NEVIRA";
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const handleOnboarding = async (name: string) => {
    if (!auth.user) return;
    await updateProfile(auth.user.id, { assistant_name: name });
    setProfile((p) => p ? { ...p, assistantName: name } : { assistantName: name, theme: "nevira", neviraColor: "aqua", novaColor: "violet" });
    setShowOnboarding(false);
    setMessages([{
      role: "assistant",
      content: `Encantada, **${name}**. Soy ${themeName}, tu asistente personal. Puedo conversar, poner música en Spotify, generar imágenes, mandar WhatsApp y mucho más. ¿Por dónde empezamos?`,
      time: timeNow(),
    }]);
  };

  const handleThemeChange = async (theme: "nevira" | "nova") => {
    if (!auth.user) return;
    setProfile((p) => p ? { ...p, theme } : p);
    await updateProfile(auth.user.id, { theme });
  };

  const handleNeviraColorChange = async (neviraColor: NeviraColor) => {
    if (!auth.user) return;
    setProfile((p) => p ? { ...p, neviraColor } : p);
    await updateProfile(auth.user.id, { nevira_color: neviraColor });
  };

  const handleNovaColorChange = async (novaColor: NovaColor) => {
    if (!auth.user) return;
    setProfile((p) => p ? { ...p, novaColor } : p);
    await updateProfile(auth.user.id, { nova_color: novaColor });
  };

  /** Sube imagen base64 al bucket y guarda en tabla. Devuelve signed URL. */
  const saveImage = useCallback(async (prompt: string, dataUrl: string): Promise<string | null> => {
    if (!auth.user) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${auth.user.id}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("generated-images")
        .upload(path, blob, { contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("generated-images")
        .createSignedUrl(path, 60 * 60);
      const url = signed?.signedUrl ?? "";
      await supabase.from("generated_images").insert({
        user_id: auth.user.id,
        prompt,
        storage_path: path,
        public_url: url,
      });
      return url;
    } catch (e) {
      console.error("saveImage error", e);
      return null;
    }
  }, [auth.user]);

  /** Detección local de comandos: WhatsApp, imagen, música, búsquedas, rename. */
  async function handleLocalIntent(text: string): Promise<boolean> {
    const intent = detectIntent(text);
    const t = normalize(text);

    // RENAME
    if (intent === "rename") {
      const m = t.match(/(?:llamame|cambia mi nombre a|mi nombre es)\s+([\p{L}\s]{2,30})/u);
      if (m) {
        setMessages((m2) => [...m2, { role: "assistant", content: "Puedes cambiar tu nombre solo desde **Ajustes** para evitar cambios accidentales.", time: timeNow() }]);
        return true;
      }
    }

    // WHATSAPP — tarjeta de confirmación (acepta número o nombre de contacto)
    if (intent === "whatsapp") {
      // Caso 1: número directo
      const byNumber = t.match(/(?:whatsapp|wasap|wsp|manda mensaje|envia mensaje)\s+(?:a\s+)?(\+?\d[\d\s-]{6,})\s+(?:diciendo|que diga|mensaje|:)\s+(.+)/);
      if (byNumber) {
        const phone = byNumber[1].replace(/[\s-]/g, "");
        const body = byNumber[2].trim();
        setMessages((m2) => [...m2, {
          role: "assistant",
          content: "",
          time: timeNow(),
          whatsapp: { phone, message: body, sent: false },
        }]);
        return true;
      }
      // Caso 2: nombre de contacto guardado
      const byName = t.match(/(?:whatsapp|wasap|wsp|manda mensaje|envia mensaje)\s+(?:a\s+)?([\p{L}\s]{2,40}?)\s+(?:diciendo|que diga|mensaje|:)\s+(.+)/u);
      if (byName) {
        const rawName = byName[1].trim();
        const body = byName[2].trim();
        const contact = findContactByName(contacts, rawName);
        if (contact) {
          setMessages((m2) => [...m2, {
            role: "assistant",
            content: "",
            time: timeNow(),
            whatsapp: { phone: contact.phone, message: body, sent: false },
          }]);
          return true;
        }
        setMessages((m2) => [...m2, {
          role: "assistant",
          content: `No encontré ningún contacto llamado **${rawName}**. Añádelo en *Menú → Ajustes → Contactos*.`,
          time: timeNow(),
        }]);
        return true;
      }
      setMessages((m2) => [...m2, { role: "assistant", content: "Dime: *WhatsApp a +52XXXXXXXXXX diciendo hola* o *WhatsApp a Mamá diciendo hola*.", time: timeNow() }]);
      return true;
    }

    // IMAGEN
    if (intent === "image") {
      const prompt = text.replace(/.*(?:genera imagen( de)?|crea imagen( de)?|dibuja|imagina|busca imagen( de)?|imagen de)\s*/i, "").trim() || text;
      const placeholderIdx = messages.length + 1; // +1 por el user msg
      setMessages((m2) => [...m2, { role: "assistant", content: "", time: timeNow(), image: { prompt, url: null } }]);
      try {
        const res = await imageFn({ data: { prompt } });
        if (res.error || !res.dataUrl) {
          setMessages((m2) => m2.map((mm, i) => i === placeholderIdx ? { ...mm, content: `⚠️ ${res.error ?? "No pude generar la imagen."}`, image: undefined } : mm));
          return true;
        }
        const url = await saveImage(prompt, res.dataUrl);
        setMessages((m2) => m2.map((mm, i) => i === placeholderIdx ? { ...mm, image: { prompt, url: url ?? res.dataUrl } } : mm));
        toast.success("Imagen guardada en tu galería");
      } catch (e) {
        console.error(e);
        setMessages((m2) => m2.map((mm, i) => i === placeholderIdx ? { ...mm, content: "⚠️ Error generando imagen.", image: undefined } : mm));
      }
      return true;
    }

    // MÚSICA SPOTIFY
    if (intent === "music") {
      if (!spotify.isAuthenticated) {
        setMessages((m2) => [...m2, { role: "assistant", content: "Para reproducir música necesito que conectes Spotify. Ábre el menú (☰) y pulsa **Conectar Spotify**.", time: timeNow() }]);
        setShowPlayer(true);
        return true;
      }
      const query = text.replace(/.*(?:pon musica|reproduce|spotify|playlist|cancion)\s*(de\s+)?/i, "").trim();
      if (!query) {
        setMessages((m2) => [...m2, { role: "assistant", content: "¿Qué quieres escuchar? Dime: *pon [canción] de [artista]*.", time: timeNow() }]);
        setShowPlayer(true);
        return true;
      }
      try {
        const name = await spotify.playSearch(query);
        setMessages((m2) => [...m2, { role: "assistant", content: `🎵 Reproduciendo **${name}** en Spotify.`, time: timeNow() }]);
        setShowPlayer(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No pude reproducir esa canción.";
        setMessages((m2) => [...m2, { role: "assistant", content: `⚠️ ${msg}`, time: timeNow() }]);
      }
      return true;
    }

    // YouTube
    if (intent === "youtube") {
      const q = text.replace(/.*(?:youtube|busca en youtube)/i, "").trim() || text;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      setMessages((m2) => [...m2, { role: "assistant", content: `Abrí YouTube buscando **${q}** 🎬`, time: timeNow() }]);
      return true;
    }

    // Google
    if (intent === "google") {
      const q = text.replace(/.*(?:busca en google|google|buscar)/i, "").trim() || text;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      setMessages((m2) => [...m2, { role: "assistant", content: `Listo, te abrí Google con **${q}** 🔎`, time: timeNow() }]);
      return true;
    }

    return false;
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || !profile || !auth.user) return;
    const userMsg: UIMessage = { role: "user", content: text, time: timeNow() };
    setMessages((m) => [...m, userMsg]);

    const handled = await handleLocalIntent(text);
    if (handled) return;

    setSending(true);
    try {
      const result = await chatFn({
        data: {
          messages: [...messages, userMsg].filter((m) => m.content).map(({ role, content }) => ({ role, content })),
          userName: profile.assistantName,
          notes,
          themeName,
        },
      });
      if (result.error) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${result.error}`, time: timeNow() }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: result.text, time: timeNow() }]);
        // Memoria contextual con IA: extrae datos relevantes del último turno.
        try {
          const ext = await memoryFn({ data: { userText: text, assistantText: result.text } });
          if (ext.note) {
            await addNote(auth.user.id, ext.note);
            setNotes((n) => [ext.note as string, ...n].slice(0, 50));
          }
        } catch (e) {
          console.error("extract memory error", e);
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Hubo un error. Intenta de nuevo.", time: timeNow() }]);
      router.invalidate();
    } finally {
      setSending(false);
    }
  };

  const handleClearMemory = async () => {
    if (!auth.user) return;
    if (!confirm("¿Borrar todo lo que sé sobre ti? (no afecta tus imágenes)")) return;
    await clearNotes(auth.user.id);
    setNotes([]);
    toast.success("Memoria borrada");
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
  };

  if (auth.loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Orb size={120} active variant="nova" />
      </div>
    );
  }

  return (
    <>
      <OnboardingModal open={showOnboarding} themeName={themeName} onSubmit={handleOnboarding} />

      <MenuDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        themeName={themeName}
        theme={profile.theme}
        userName={profile.assistantName}
        notesCount={notes.length}
        onThemeChange={handleThemeChange}
        onSection={(s) => {
          setDrawerOpen(false);
          if (s === "music") setShowPlayer(true);
          if (s === "images") sendMessage("Genera una imagen de ");
          if (s === "whatsapp") sendMessage("WhatsApp a +52 diciendo ");
           if (s === "settings") { setSettingsView("menu"); setSettingsOpen(true); }
           if (s === "docs") { setSettingsView("docs"); setSettingsOpen(true); }
        }}
        onClearMemory={handleClearMemory}
        onLogout={handleLogout}
      />

      {auth.user && (
        <SettingsDrawer
          open={settingsOpen}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            // Recargar contactos al cerrar para reflejar cambios
            if (!open && auth.user) {
              fetchContacts(auth.user.id).then(setContacts).catch(() => { /* noop */ });
            }
          }}
          userId={auth.user.id}
          themeName={themeName}
          initialView={settingsView}
          spotifyConnected={spotify.isAuthenticated && spotify.state.ready}
          onGeneratePlaylistFromArtists={spotify.generateArtistPlaylistQueries}
          onSearchArtists={spotify.searchArtists}
          onPlayPlaylist={async (queries, name) => {
            try {
              setShowPlayer(true);
              await spotify.playLocalPlaylist(queries);
              setMessages((m) => [...m, {
                role: "assistant",
                content: `🎵 Reproduciendo tu playlist **${name}** (${queries.length} canciones).`,
                time: timeNow(),
              }]);
            } catch (e) {
              const msg = e instanceof Error ? e.message : "No pude reproducir la playlist.";
              toast.error(msg);
            }
          }}
        />
      )}
      <div className="flex min-h-screen w-full bg-gradient-bg">
        <AppSidebar
          themeName={themeName}
          userName={profile.assistantName}
          active={activeMenu}
          onSelect={setActiveMenu}
        />

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                {greeting}, <span className="text-gradient">{profile.assistantName ?? "tú"}</span>
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                Modo <span className="font-bold text-foreground">{themeName}</span> activo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitch theme={profile.theme} onChange={handleThemeChange} />
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/50 hover:text-primary"
                aria-label="Menú"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6 lg:px-8 lg:py-8">
              <section className="min-w-0">
              {showPlayer && (
                <div className="mb-4 w-full lg:hidden">
                  <SpotifyPlayer
                    state={spotify.state}
                    isAuthenticated={spotify.isAuthenticated}
                    onLogin={() => spotify.startLogin().catch((e) => toast.error(e.message))}
                    onLogout={spotify.logout}
                    onToggle={spotify.togglePlay}
                    onNext={spotify.next}
                    onPrev={spotify.prev}
                    onVolume={spotify.setVolume}
                    onListDevices={spotify.listDevices}
                    onTransfer={spotify.transferPlayback}
                  />
                </div>
              )}

              {messages.length === 0 ? (
                <div className="flex min-h-[56svh] flex-col items-center justify-center gap-6 py-8 text-center lg:min-h-[70svh]">
                  <Orb size={220} active variant={profile.theme} className="sm:[transform:scale(1.05)]" />
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                      Modo <span className="text-gradient">{themeName}</span> activo
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                      {themeName === "NOVA" ? "Listo para ayudarte a lograr cualquier cosa." : "¿En qué puedo ayudarte hoy?"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-4 pb-4">
                  {messages.map((m, i) => {
                    if (m.image) {
                      return (
                        <div key={i} className="flex w-full justify-start animate-float-up">
                          <div className="max-w-[85%] w-full sm:w-80">
                            <ImageMessage
                              prompt={m.image.prompt}
                              url={m.image.url}
                              onDownload={m.image.url ? () => window.open(m.image!.url!, "_blank") : undefined}
                            />
                          </div>
                        </div>
                      );
                    }
                    if (m.whatsapp) {
                      return (
                        <div key={i} className="flex w-full justify-start animate-float-up">
                          <div className="max-w-[85%] w-full sm:w-96">
                            {m.whatsapp.sent ? (
                              <ChatBubble themeName={themeName} message={{ role: "assistant", content: `📲 Abrí WhatsApp con tu mensaje a **${m.whatsapp.phone}**.`, time: m.time }} />
                            ) : (
                              <WhatsAppConfirm
                                phone={m.whatsapp.phone}
                                message={m.whatsapp.message}
                                onConfirm={() => {
                                  window.open(`https://wa.me/${m.whatsapp!.phone.replace(/\D/g, "")}?text=${encodeURIComponent(m.whatsapp!.message)}`, "_blank", "noopener,noreferrer");
                                  setMessages((mm) => mm.map((x, j) => j === i && x.whatsapp ? { ...x, whatsapp: { ...x.whatsapp, sent: true } } : x));
                                }}
                                onCancel={() => setMessages((mm) => mm.filter((_, j) => j !== i))}
                              />
                            )}
                          </div>
                        </div>
                      );
                    }
                    return <ChatBubble key={i} message={m} themeName={themeName} />;
                  })}
                  {sending && (
                    <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 animate-pulse text-primary" />
                      {themeName} está escribiendo…
                    </div>
                  )}
                </div>
              )}
              </section>

              <aside className="hidden lg:sticky lg:top-24 lg:block">
                <div className="space-y-4">
                  <SpotifyPlayer
                    state={spotify.state}
                    isAuthenticated={spotify.isAuthenticated}
                    onLogin={() => spotify.startLogin().catch((e) => toast.error(e.message))}
                    onLogout={spotify.logout}
                    onToggle={spotify.togglePlay}
                    onNext={spotify.next}
                    onPrev={spotify.prev}
                    onVolume={spotify.setVolume}
                    onListDevices={spotify.listDevices}
                    onTransfer={spotify.transferPlayback}
                  />
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <LayoutPanelLeft className="h-4 w-4 text-primary" />
                      {themeName} activo
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {themeName === "NOVA"
                        ? "Interfaz concentrada para música, imágenes y acciones rápidas sin dejar espacios vacíos."
                        : "Vista más compacta y útil para conversar, crear imágenes y controlar Spotify."}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-border bg-background/60 backdrop-blur">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 lg:py-4">
              <ChatComposer onSend={sendMessage} disabled={sending} />
              {messages.length === 0 && <QuickActions onPick={(p) => sendMessage(p)} />}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Cifrado y privado
                </span>
                <span className="hidden sm:inline">{themeName} · Tu asistente personal</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
