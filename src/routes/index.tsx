import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/use-auth";
import {
  fetchProfile,
  fetchNotes,
  updateProfile,
  type NeviraColor,
  type NovaColor,
} from "@/lib/cloud-memory";
import { useSpotify } from "@/hooks/use-spotify";
import { Orb } from "@/components/Orb";
import { SoundWaves } from "@/components/SoundWaves";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MenuDrawer } from "@/components/MenuDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { DashboardCard } from "@/components/DashboardCard";
import { HomeHero } from "@/components/HomeHero";
import {
  Music,
  Image as ImageIcon,
  FileText,
  Brain,
  Bell,
  Sparkles,
  MessageCircleMore,
  Send,
  Wallet,
  Activity,
  Menu,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "NEVIRA & NOVA — Tu asistente inteligente" },
      {
        name: "description",
        content:
          "Dashboard personal con música, imágenes IA, documentos, recordatorios y más. Dos modos: NEVIRA (día) y NOVA (noche).",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    assistantName: string | null;
    theme: "nevira" | "nova";
    neviraColor: NeviraColor;
    novaColor: NovaColor;
  } | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [imageCount, setImageCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<
    "menu" | "playlists" | "playlist-detail" | "contacts" | "docs"
  >("menu");

  const spotify = useSpotify(!!auth.user, auth.user?.id ?? null);

  useEffect(() => {
    if (!auth.user) return;
    (async () => {
      const p = await fetchProfile(auth.user!.id);
      const n = await fetchNotes(auth.user!.id);
      setProfile({
        assistantName: p?.assistant_name ?? null,
        theme: (p?.theme as "nevira" | "nova") ?? "nevira",
        neviraColor: (p?.nevira_color as NeviraColor) ?? "aqua",
        novaColor: (p?.nova_color as NovaColor) ?? "violet",
      });
      setNotesCount(n.length);
      if (!p?.assistant_name) setShowOnboarding(true);
      // Conteos para tarjetas (silencioso si tablas vacías)
      try {
        const { count: ic } = await supabase
          .from("generated_images")
          .select("*", { count: "exact", head: true })
          .eq("user_id", auth.user!.id);
        setImageCount(ic ?? 0);
      } catch {
        /* noop */
      }
      try {
        const { count: dc } = await supabase
          .from("generated_documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", auth.user!.id);
        setDocCount(dc ?? 0);
      } catch {
        /* noop */
      }
    })();
  }, [auth.user]);

  // Aplicar tema al <html>
  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    root.classList.toggle("nova", profile.theme === "nova");
    root.classList.forEach((c) => {
      if (c.startsWith("nevira-") || c.startsWith("nova-")) root.classList.remove(c);
    });
    if (profile.theme === "nova") root.classList.add(`nova-${profile.novaColor}`);
    else root.classList.add(`nevira-${profile.neviraColor}`);
  }, [profile?.theme, profile?.neviraColor, profile?.novaColor]);

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
    setProfile((p) =>
      p
        ? { ...p, assistantName: name }
        : { assistantName: name, theme: "nevira", neviraColor: "aqua", novaColor: "violet" },
    );
    setShowOnboarding(false);
  };

  const handleThemeChange = async (theme: "nevira" | "nova") => {
    if (!auth.user) return;
    setProfile((p) => (p ? { ...p, theme } : p));
    await updateProfile(auth.user.id, { theme });
  };
  const handleNeviraColorChange = async (c: NeviraColor) => {
    if (!auth.user) return;
    setProfile((p) => (p ? { ...p, neviraColor: c } : p));
    await updateProfile(auth.user.id, { nevira_color: c });
  };
  const handleNovaColorChange = async (c: NovaColor) => {
    if (!auth.user) return;
    setProfile((p) => (p ? { ...p, novaColor: c } : p));
    await updateProfile(auth.user.id, { nova_color: c });
  };

  const sendToChat = (q: string) => {
    if (!q.trim()) return;
    navigate({ to: "/chat", search: { q } });
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
  };

  if (auth.loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-bg">
        <Orb size={120} active variant="nova" />
      </div>
    );
  }

  const track = spotify.state.current;
  const musicActive = !spotify.state.paused && !!track;

  return (
    <>
      <OnboardingModal open={showOnboarding} themeName={themeName} onSubmit={handleOnboarding} />

      <MenuDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        themeName={themeName}
        theme={profile.theme}
        userName={profile.assistantName}
        notesCount={notesCount}
        neviraColor={profile.neviraColor}
        novaColor={profile.novaColor}
        onThemeChange={handleThemeChange}
        onNeviraColorChange={handleNeviraColorChange}
        onNovaColorChange={handleNovaColorChange}
        onSection={(s) => {
          setDrawerOpen(false);
          if (s === "music") navigate({ to: "/chat", search: { q: "Pon música" } });
          if (s === "images") navigate({ to: "/chat", search: { q: "Genera una imagen de " } });
          if (s === "whatsapp")
            navigate({ to: "/chat", search: { q: "WhatsApp a +52 diciendo " } });
          if (s === "settings") {
            setSettingsView("menu");
            setSettingsOpen(true);
          }
          if (s === "docs") {
            setSettingsView("docs");
            setSettingsOpen(true);
          }
        }}
        onClearMemory={() => toast.message("Abre Ajustes → Memoria desde el chat")}
        onLogout={handleLogout}
      />

      {auth.user && (
        <SettingsDrawer
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          userId={auth.user.id}
          themeName={themeName}
          initialView={settingsView}
          spotifyConnected={spotify.isAuthenticated && spotify.state.ready}
          onGeneratePlaylistFromArtists={spotify.generateArtistPlaylistQueries}
          onSearchArtists={spotify.searchArtists}
          onPlayPlaylist={async (queries, name) => {
            try {
              await spotify.playLocalPlaylist(queries);
              toast.success(`Reproduciendo ${name}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No pude reproducir.");
            }
          }}
        />
      )}

      <div className="flex min-h-screen w-full bg-gradient-bg">
        <AppSidebar themeName={themeName} userName={profile.assistantName} />

        <main className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {greeting}, <span className="text-gradient">{profile.assistantName ?? "tú"}</span>
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
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

          {/* Hero + dashboard */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:pt-6 lg:px-8 lg:pt-8">
              <HomeHero
                themeName={themeName}
                theme={profile.theme}
                musicActive={musicActive}
                bpm={spotify.state.tempo}
                energy={spotify.state.energy}
                onSearch={sendToChat}
              />

              {/* Sugerencias rápidas */}
              <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6">
                <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                  <Sparkles className="h-3 w-3 text-primary" /> Sugerencias rápidas
                </span>
                {[
                  themeName === "NOVA" ? "Crea una imagen cyberpunk" : "Resumen de mi día",
                  themeName === "NOVA" ? "Escribe una historia corta" : "Reproduce música lofi",
                  themeName === "NOVA" ? "Dame ideas de negocio" : "Envía mensaje a mamá",
                  themeName === "NOVA" ? "Crea un fondo épico" : "Agenda reunión mañana",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendToChat(s)}
                    className="glass rounded-full px-3 py-1.5 text-[11px] font-medium hover:border-primary/60 hover:bg-card/80 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Dashboard grid */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Música */}
                <DashboardCard
                  title="Música"
                  icon={Music}
                  badge={
                    spotify.isAuthenticated ? (musicActive ? "Sonando" : "Spotify") : "Conectar"
                  }
                  badgeTone={musicActive ? "primary" : "muted"}
                  onClick={() => navigate({ to: "/chat", search: { q: "Pon música" } })}
                >
                  {track ? (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted shadow-card">
                        {track.cover ? (
                          <img src={track.cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{track.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {track.artist}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {spotify.isAuthenticated
                        ? "Pídeme una canción y la reproduzco aquí."
                        : "Conecta tu Spotify para reproducir música directamente."}
                    </p>
                  )}
                  <SoundWaves
                    active={musicActive}
                    bpm={spotify.state.tempo}
                    energy={spotify.state.energy}
                    variant={profile.theme}
                    bars={20}
                    height={28}
                    className="mt-3"
                  />
                </DashboardCard>

                {/* Imágenes IA */}
                <DashboardCard
                  title="Imágenes IA"
                  icon={ImageIcon}
                  badge={imageCount !== null ? `${imageCount}` : "—"}
                  onClick={() => navigate({ to: "/gallery" })}
                >
                  <p className="text-xs text-muted-foreground">
                    Genera imágenes con texto o explora tu galería personal.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToChat("Genera una imagen de ");
                      }}
                      className="flex-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                    >
                      Generar
                    </button>
                    <Link
                      to="/gallery"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-center text-xs font-medium hover:border-primary/60 transition"
                    >
                      Ver galería
                    </Link>
                  </div>
                </DashboardCard>

                {/* Documentos */}
                <DashboardCard
                  title="Documentos"
                  icon={FileText}
                  badge={docCount !== null ? `${docCount}` : "—"}
                  onClick={() => {
                    setSettingsView("docs");
                    setSettingsOpen(true);
                  }}
                >
                  <p className="text-xs text-muted-foreground">
                    Crea Word, Excel y PowerPoint con un mensaje. Descarga directa.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToChat("Crea un documento de Word sobre ");
                      }}
                      className="flex-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                    >
                      Crear
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsView("docs");
                        setSettingsOpen(true);
                      }}
                      className="flex-1 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs font-medium hover:border-primary/60 transition"
                    >
                      Historial
                    </button>
                  </div>
                </DashboardCard>

                {/* WhatsApp */}
                <DashboardCard
                  title="WhatsApp"
                  icon={Send}
                  badge="Voz"
                  onClick={() => sendToChat("WhatsApp a ")}
                >
                  <p className="text-xs text-muted-foreground">
                    Dicta o escribe: "WhatsApp a Mamá diciendo …" y confirma con un toque.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettingsView("contacts");
                      setSettingsOpen(true);
                    }}
                    className="mt-3 w-full rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs font-medium hover:border-primary/60 transition"
                  >
                    Mis contactos
                  </button>
                </DashboardCard>

                {/* Memoria */}
                <DashboardCard
                  title="Memoria contextual"
                  icon={Brain}
                  badge={`${notesCount}`}
                  badgeTone="primary"
                >
                  <p className="text-xs text-muted-foreground">
                    {notesCount > 0
                      ? `${themeName} recuerda ${notesCount} cosas sobre ti para respuestas más precisas.`
                      : "A medida que conversemos, recordaré lo que importa."}
                  </p>
                  <Link
                    to="/chat"
                    className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Hablar con {themeName} →
                  </Link>
                </DashboardCard>

                {/* Conversación */}
                <DashboardCard
                  title="Conversación"
                  icon={MessageCircleMore}
                  badge="Voz / texto"
                  onClick={() => navigate({ to: "/chat" })}
                >
                  <p className="text-xs text-muted-foreground">
                    Habla por voz o escribe. {themeName} entiende contexto y aprende de ti.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Activity className="h-3 w-3 animate-pulse text-primary" />
                    Listo para escucharte
                  </div>
                </DashboardCard>

                {/* Automatizaciones */}
                <DashboardCard
                  title="Automatizaciones"
                  icon={Zap}
                  badge="Nuevo"
                  badgeTone="primary"
                  onClick={() => navigate({ to: "/automations" })}
                >
                  <p className="text-xs text-muted-foreground">
                    Geocercas, horarios y disparadores con WhatsApp y Spotify.
                  </p>
                </DashboardCard>

                {/* Finanzas (placeholder) */}
                <DashboardCard title="Finanzas" icon={Wallet} badge="Próximo" badgeTone="muted">
                  <p className="text-xs text-muted-foreground">
                    Resumen mensual y categorías. Disponible muy pronto.
                  </p>
                </DashboardCard>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileTabBar onMenu={() => setDrawerOpen(true)} />
    </>
  );
}
