import { MessageSquare, Sparkles, Music2, Image as ImageIcon, FileText, Brain, Heart, Disc3, Wand2, Layers, Clock, Star, Settings as SettingsIcon, TrendingUp, Workflow, Database, Radio, BookOpen, Shield, Cpu, Gauge, Code2, Trash2, Download, Plus, Send, Phone as PhoneIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { getModule } from "@/lib/modules";
import { MusicPlayerWidget } from "@/components/dashboard/MusicPlayerWidget";
import { SpotifyConnectButton } from "@/components/dashboard/SpotifyConnectButton";
import { PerfGauge } from "@/components/dashboard/PerfGauge";
import { Waveform } from "@/components/dashboard/Waveform";
import { Icon3D } from "@/components/Icon3D";
import { AjustesPanel } from "@/components/sections/ThemeSettings";
import {
  useNovaThreads, useGeneratedImages, useGeneratedDocuments, useUserMemory,
  useDeleteMemory, useWhatsappContacts, useAddContact, useDeleteContact,
  downloadDocument,
} from "@/lib/module-data";
import { useModuleStats, useLivePerf } from "@/lib/module-stats";
import { toast } from "sonner";

/* ---------------- ambient FX ---------------- */
function AmbientParticles({ count = 14 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const size = 4 + ((i * 7) % 9);
        const left = (i * 53) % 100;
        const top = (i * 37) % 100;
        const delay = (i % 5) * 0.6;
        return (
          <span key={i} className="orb-particle"
            style={{ width: size, height: size, left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} />
        );
      })}
    </div>
  );
}

function RoomHeader({ icon: Icon, eyebrow, title, subtitle }: {
  icon: typeof Sparkles; eyebrow: string; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <Icon3D className="h-12 w-12 shrink-0"><Icon className="h-5 w-5" /></Icon3D>
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-mono">{eyebrow}</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-[0.18em] glow-text leading-none mt-1">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-2 max-w-xl">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ---------------- shared shell ---------------- */
function Panel({ title, subtitle, children, cta, onCta }: {
  title: string; subtitle?: string; children: React.ReactNode; cta?: string; onCta?: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-xl p-5 overflow-hidden"
      style={{ boxShadow: "0 0 30px color-mix(in oklab, var(--glow) 18%, transparent), inset 0 1px 0 color-mix(in oklab, white 8%, transparent)" }}>
      <div className="absolute top-2 left-2 h-3 w-3 border-l border-t border-primary/60" />
      <div className="absolute top-2 right-2 h-3 w-3 border-r border-t border-primary/60" />
      <div className="absolute bottom-2 left-2 h-3 w-3 border-l border-b border-primary/60" />
      <div className="absolute bottom-2 right-2 h-3 w-3 border-r border-b border-primary/60" />
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display tracking-[0.25em] text-sm uppercase glow-text">{title}</h3>
          {subtitle && <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {cta && (
          <button onClick={onCta} className="text-[10px] uppercase tracking-[0.25em] text-primary hover:text-foreground transition">
            {cta} →
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

function ChatCta({ onChat, label = "Iniciar conversación" }: { onChat: () => void; label?: string }) {
  return (
    <button onClick={onChat}
      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-4 py-2 text-xs uppercase tracking-[0.25em] font-display hover:bg-primary/25 transition"
      style={{ boxShadow: "0 0 18px color-mix(in oklab, var(--glow) 35%, transparent)" }}>
      <MessageSquare className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono">
      <span className="w-20 text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          style={{ width: `${value}%`, boxShadow: "0 0 10px var(--glow)" }} />
      </div>
      <span className="w-10 text-right text-foreground/80">{value}%</span>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card/40 p-3">
      <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-display glow-text">{value}</div>
      {delta && <div className="text-[10px] text-emerald-300/90 font-mono">{delta}</div>}
    </div>
  );
}

/* ===================================================== */
/* NOVA SECTIONS                                          */
/* ===================================================== */
export function NovaSection({ slug, onChat }: { slug: string; onChat: () => void }) {
  const m = getModule("nova", slug);

  switch (slug) {
    case "conversacion":
      return <ConversacionRoom onChat={onChat} />;


    case "musica":
      return (
        <section className="smart-room theme-transition animate-fade-in">
          <AmbientParticles count={16} />
          <RoomHeader icon={Music2} eyebrow="Estudio sonoro · NOVA"
            title="Música" subtitle="Tu cabina holográfica para componer, descubrir y dejarte llevar." />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5 flex items-center justify-center min-h-[320px] relative">
              <div className="relative h-60 w-60">
                <div className="vinyl-spin h-full w-full rounded-full border-2 border-primary/40"
                  style={{ background: "repeating-radial-gradient(circle at center, color-mix(in oklab, var(--primary) 15%, transparent) 0 4px, transparent 4px 8px)" }} />
                <div className="absolute inset-12 rounded-full bg-card/80 backdrop-blur grid place-items-center border border-primary/40"
                  style={{ boxShadow: "0 0 40px var(--glow)" }}>
                  <Disc3 className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="absolute -inset-3 rounded-full border border-primary/20 holo-ring" />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-md p-4 space-y-3">
                <SpotifyConnectButton />
                <MusicPlayerWidget />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-2">Playlists</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { n: "Enfoque Total", c: "18", g: "synth" },
                    { n: "Creatividad Fluida", c: "12", g: "ambient" },
                    { n: "Energía Positiva", c: "30", g: "indie" },
                    { n: "NOVA Mix", c: "50", g: "auto" },
                  ].map((p) => (
                    <div key={p.n} className="holo-card flex items-center gap-3 rounded-xl border border-primary/25 bg-card/40 backdrop-blur-md px-3 py-2.5">
                      <Icon3D className="h-9 w-9"><Sparkles className="h-4 w-4" /></Icon3D>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.n}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.c} · {p.g}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ChatCta onChat={onChat} label="Componer con NOVA" />
            </div>
          </div>
        </section>
      );

    case "imagenes":
      return <ImagenesRoom onChat={onChat} />;


    case "documentos":
      return <DocumentosRoom onChat={onChat} />;


    case "memoria":
      return <MemoriaRoom onChat={onChat} />;



    case "automatizaciones":
      return (
        <Panel title="Automatizaciones" subtitle="Flujos inteligentes que trabajan por ti" cta="Crear flujo" onCta={onChat}>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {[
              { t: "Trigger", s: "Nuevo email" },
              { t: "Acción", s: "Analizar contenido" },
              { t: "Condición", s: "¿Es importante?" },
              { t: "Sí", s: "Guardar en Drive" },
              { t: "No", s: "Archivar" },
            ].map((n, i) => (
              <div key={i} className="rounded-xl border border-primary/30 bg-card/40 px-3 py-2 min-w-[140px]">
                <div className="text-[9px] uppercase tracking-[0.25em] text-primary">{n.t}</div>
                <div className="text-sm">{n.s}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat label="Flujos activos" value="12" />
            <Stat label="Ejecutados hoy" value="24" />
            <Stat label="Eficiencia" value="98%" delta="+2%" />
          </div>
        </Panel>
      );

    case "calendario":
      return (
        <Panel title="Calendario" subtitle="Tu tiempo, tu mejor aliado" cta="Nuevo evento" onCta={onChat}>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className={`aspect-square rounded-lg border text-center grid place-items-center ${
                i === 12 ? "border-primary bg-primary/25 glow-text" : "border-primary/20 bg-card/30"
              }`}>{i + 1}</div>
            ))}
          </div>
        </Panel>
      );

    case "whatsapp":
      return <WhatsappRoom onChat={onChat} />;


    case "finanzas":
      return (
        <Panel title="Finanzas" subtitle="Salud financiera" cta="Plan personalizado" onCta={onChat}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Balance" value="$ 12,480" delta="+8.2%" />
            <Stat label="Ahorro" value="$ 3,200" delta="+12%" />
            <Stat label="Gasto mes" value="$ 1,820" />
          </div>
          <div className="space-y-2">
            <Bar label="Vivienda" value={42} />
            <Bar label="Comida" value={26} />
            <Bar label="Ocio" value={18} />
            <Bar label="Ahorro" value={14} />
          </div>
        </Panel>
      );

    case "ajustes":
      return (
        <section className="smart-room theme-transition animate-fade-in">
          <AmbientParticles count={10} />
          <RoomHeader icon={SettingsIcon} eyebrow="Personalización · NOVA"
            title="Ajustes" subtitle="Define la paleta y la tipografía que sientes como tuyas. Tus elecciones viajan a NEVIRA." />
          <AjustesPanel assistant="nova" />
        </section>
      );

    default:
      return (
        <Panel title={m.label} subtitle={m.description}>
          <p className="text-sm text-muted-foreground">Módulo creativo listo para inspirarte.</p>
          <ChatCta onChat={onChat} />
        </Panel>
      );
  }
}

/* ===================================================== */
/* NEVIRA SECTIONS                                        */
/* ===================================================== */
function NeviraRoom({ icon: Icon, eyebrow, title, subtitle, children }: {
  icon: typeof Sparkles; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={12} />
      <RoomHeader icon={Icon} eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

export function NeviraSection({ slug, onChat }: { slug: string; onChat: () => void }) {
  const m = getModule("nevira", slug);

  switch (slug) {
    case "productividad":
      return <ProductividadRoom onChat={onChat} />;

    case "analisis":
      return <AnalisisRoom onChat={onChat} />;

    case "automatizaciones":
      return <AutomatizacionesNeviraRoom onChat={onChat} />;

    case "datos":
      return <DatosRoom onChat={onChat} />;

    case "comunicacion":
      return <ComunicacionRoom onChat={onChat} />;

    case "memoria":
      return <MemoriaNeviraRoom onChat={onChat} />;

    case "seguridad":
      return <SeguridadRoom onChat={onChat} />;

    case "sistema":
      return <SistemaRoom onChat={onChat} />;

    case "rendimiento":
      return <RendimientoRoom onChat={onChat} />;

    case "codigo":
      return (
        <NeviraRoom icon={Code2} eyebrow="Laboratorio de código · NEVIRA"
          title="Código IA" subtitle="Describe el sistema que quieres construir y NEVIRA lo materializa.">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-6">
              <div className="holo-workspace rounded-xl p-3">
                <div className="code-block">
                  <div><span className="code-tok-com">// componente generado por NEVIRA</span></div>
                  <div><span className="code-tok-key">export function</span> <span className="code-tok-fn">NeuralCard</span>() &#123;</div>
                  <div>  <span className="code-tok-key">return</span> &lt;<span className="code-tok-fn">HoloPanel</span> /&gt;;</div>
                  <div>&#125;</div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <div className="rounded-xl border border-primary/30 bg-card/40 p-4">
                <div className="text-xs text-foreground/85">Pide a NEVIRA que genere componentes, endpoints o arquitecturas completas.</div>
                <ChatCta onChat={onChat} label="Hablar con NEVIRA" />
              </div>
            </div>
          </div>
        </NeviraRoom>
      );

    case "ajustes":
      return (
        <NeviraRoom icon={SettingsIcon} eyebrow="Personalización · NEVIRA"
          title="Ajustes" subtitle="Define la paleta y tipografía del ecosistema completo.">
          <AjustesPanel assistant="nevira" />
        </NeviraRoom>
      );

    case "panel":
    default:
      return (
        <Panel title={m.label} subtitle={m.description}>
          <p className="text-sm text-muted-foreground">Selecciona un módulo en el panel lateral o usa el cubo central.</p>
          <ChatCta onChat={onChat} label="Iniciar sesión con NEVIRA" />
        </Panel>
      );
  }
}

/* ===================================================== */
/* LIVE NOVA ROOMS                                        */
/* ===================================================== */

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-card/30 p-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…
    </div>
  );
}

/* ---------------- CONVERSACIÓN ---------------- */
function ConversacionRoom({ onChat }: { onChat: () => void }) {
  const { data, isLoading } = useNovaThreads();
  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={18} />
      <RoomHeader icon={Heart} eyebrow="Sala de diálogo · NOVA"
        title="Conversación" subtitle="Una habitación íntima para pensar en voz alta. NOVA escucha, refleja y te acompaña." />
      <div className="relative grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-7 relative flex flex-col items-center justify-center min-h-[320px]">
          <div className="holo-ring h-64 w-64 grid place-items-center">
            <div className="absolute inset-10 rounded-full border border-primary/25" />
            <div className="absolute inset-20 rounded-full bg-primary/20 blur-xl" />
            <Waveform variant="smooth" height={90} bars={56} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[10px] uppercase tracking-[0.3em] font-mono">
            {["Reflexionar", "Desahogarse", "Crear", "Soñar"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 backdrop-blur-sm">{t}</span>
            ))}
          </div>
          <ChatCta onChat={onChat} label="Abrir conversación" />
        </div>
        <div className="col-span-12 md:col-span-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">Conversaciones recientes</div>
          {isLoading && <LoadingRow />}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <EmptyHint>Aún no hay conversaciones. Pulsa “Abrir conversación”.</EmptyHint>
          )}
          {data?.map((s) => (
            <div key={s.id} onClick={onChat} className="group relative flex items-center gap-3 rounded-xl border border-primary/25 bg-card/40 backdrop-blur-md px-4 py-3 hover:border-primary/50 hover:bg-primary/10 transition cursor-pointer">
              <div className="text-xl">💬</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.title}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.module} · {s.relative}</div>
              </div>
              <MessageSquare className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- IMÁGENES ---------------- */
function ImagenesRoom({ onChat }: { onChat: () => void }) {
  const { data, isLoading } = useGeneratedImages();
  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={20} />
      <RoomHeader icon={ImageIcon} eyebrow="Laboratorio visual · NOVA"
        title="Imágenes IA" subtitle="Pídele a NOVA que genere una imagen y aparecerá aquí." />
      <div className="mb-5 flex items-center gap-3">
        <ChatCta onChat={onChat} label="Generar nueva imagen" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-muted-foreground">
          {data?.length ?? 0} en tu galería
        </span>
      </div>
      {isLoading && <LoadingRow />}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyHint>Aún no has generado imágenes. Escribe por ejemplo: “Genera una ciudad neón al amanecer”.</EmptyHint>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.map((img) => (
          <a key={img.id} href={img.url} target="_blank" rel="noreferrer"
            className="holo-card aspect-[4/5] rounded-2xl border border-primary/30 overflow-hidden relative group block">
            <img src={img.url} alt={img.prompt} loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-[10px] tracking-wide opacity-0 group-hover:opacity-100 transition flex items-center gap-1 line-clamp-2">
              <Wand2 className="h-3 w-3 shrink-0" /> {img.prompt}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---------------- DOCUMENTOS ---------------- */
function DocumentosRoom({ onChat }: { onChat: () => void }) {
  const { data, isLoading } = useGeneratedDocuments();
  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      await downloadDocument(storagePath, fileName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo descargar");
    }
  };
  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={10} />
      <RoomHeader icon={FileText} eyebrow="Biblioteca viva · NOVA"
        title="Documentos" subtitle="Cada documento que guarda NOVA aparece aquí, listo para descargar." />
      <div className="mb-5"><ChatCta onChat={onChat} label="Crear documento" /></div>
      {isLoading && <LoadingRow />}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyHint>Aún no tienes documentos. Pide: “Guarda un documento con mi plan semanal”.</EmptyHint>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((d) => (
          <div key={d.id} className="paper-sheen relative rounded-2xl p-5 holo-card overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <Icon3D className="h-11 w-11"><FileText className="h-5 w-5" /></Icon3D>
              <span className="text-[9px] uppercase tracking-[0.25em] text-primary/80 font-mono px-2 py-0.5 rounded-full border border-primary/30">
                {d.format}
              </span>
            </div>
            <div className="font-display text-lg tracking-wider truncate" title={d.title}>{d.title}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{d.relative}</div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <Layers className="h-3 w-3" /> {d.file_name}
            </div>
            <button
              onClick={() => handleDownload(d.storage_path, d.file_name)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-primary/20 transition"
            >
              <Download className="h-3 w-3" /> Descargar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- MEMORIA ---------------- */
function MemoriaRoom({ onChat }: { onChat: () => void }) {
  const { data, isLoading } = useUserMemory();
  const del = useDeleteMemory();
  const memories = data ?? [];
  const nodes = memories.slice(0, 9);
  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={12} />
      <RoomHeader icon={Brain} eyebrow="Mente conectada · NOVA"
        title="Memoria" subtitle="Una constelación de hechos que NOVA recuerda sobre ti." />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-7 min-h-[340px] relative rounded-2xl border border-primary/30 overflow-hidden"
          style={{ background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--glow) 25%, transparent), transparent 65%)" }}>
          {nodes.map((_, i) => {
            const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
            return <div key={`l${i}`} className="mem-link" style={{ width: "36%", transform: `rotate(${(a * 180) / Math.PI}deg)` }} />;
          })}
          {nodes.map((m, i) => {
            const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 38;
            const y = 50 + Math.sin(a) * 38;
            return (
              <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}>
                <div className="mem-node" style={{ animationDelay: `${i * 0.2}s`, position: "relative", left: 0, top: 0, transform: "none" }} />
                <div className="mt-1 text-[9px] uppercase tracking-widest font-mono text-foreground/85 max-w-[80px] truncate">{m.key}</div>
              </div>
            );
          })}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-primary/40 border border-primary grid place-items-center"
            style={{ boxShadow: "0 0 50px var(--glow)" }}>
            <Brain className="h-7 w-7 text-foreground" />
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
            {memories.length} recuerdo{memories.length === 1 ? "" : "s"}
          </div>
          {isLoading && <LoadingRow />}
          {!isLoading && memories.length === 0 && (
            <EmptyHint>NOVA aún no guarda nada. Dile: “Recuerda que prefiero un tono cálido”.</EmptyHint>
          )}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {memories.map((m) => (
              <div key={m.id} className="group rounded-xl border border-primary/25 bg-card/40 backdrop-blur-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="text-[10px] uppercase tracking-widest text-primary/80 font-mono truncate flex-1">{m.key}</span>
                  <span className="text-[9px] text-muted-foreground">{m.relative}</span>
                  <button
                    onClick={() => del.mutate(m.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-xs mt-1 text-foreground/85 line-clamp-3">{m.value}</div>
              </div>
            ))}
          </div>
          <ChatCta onChat={onChat} label="Guardar nuevo recuerdo" />
        </div>
      </div>
    </section>
  );
}

/* ---------------- WHATSAPP ---------------- */
function WhatsappRoom({ onChat }: { onChat: () => void }) {
  const { data, isLoading } = useWhatsappContacts();
  const add = useAddContact();
  const del = useDeleteContact();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    add.mutate(
      { name, phone },
      {
        onSuccess: () => { setName(""); setPhone(""); toast.success("Contacto agregado"); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
      },
    );
  };

  return (
    <section className="smart-room theme-transition animate-fade-in">
      <AmbientParticles count={10} />
      <RoomHeader icon={MessageSquare} eyebrow="Mensajería · NOVA"
        title="WhatsApp" subtitle="Tus contactos están a una frase de distancia. Pídele a NOVA que escriba y envíe." />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-5 space-y-3">
          <form onSubmit={submit} className="rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-md p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono mb-1">Nuevo contacto</div>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre" required maxLength={80}
              className="w-full rounded-lg bg-background/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono (sin +, ej. 521555…)" required inputMode="tel"
              className="w-full rounded-lg bg-background/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button type="submit" disabled={add.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-primary/25 transition disabled:opacity-50">
              {add.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Agregar
            </button>
          </form>
          <ChatCta onChat={onChat} label="Pedir a NOVA que envíe un mensaje" />
        </div>
        <div className="col-span-12 md:col-span-7 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
            Contactos ({data?.length ?? 0})
          </div>
          {isLoading && <LoadingRow />}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <EmptyHint>Aún no tienes contactos. Agrega uno a la izquierda para que NOVA pueda llamarlo por su nombre.</EmptyHint>
          )}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {data?.map((c) => (
              <div key={c.id} className="group flex items-center gap-3 rounded-xl border border-primary/25 bg-card/40 backdrop-blur-md px-3 py-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 border border-primary/30">
                  <PhoneIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{c.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">+{c.phone}</div>
                </div>
                <button
                  onClick={onChat}
                  title="Enviar mensaje con NOVA"
                  className="text-primary/80 hover:text-primary transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => del.mutate(c.id)}
                  title="Eliminar contacto"
                  className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* re-exports */
export { Sparkles };

