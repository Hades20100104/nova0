import { useNavigate } from "@tanstack/react-router";
import { LogOut, ChevronRight, User as UserIcon, Sparkles, Cpu, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getModules, type ModuleDef } from "@/lib/modules";
import { Icon3D } from "@/components/Icon3D";
import { useUserSections, useSectionMutations } from "@/hooks/use-user-sections";
import neviraLogo from "@/assets/nevira-logo.png";
import novaLogo from "@/assets/nova-logo.png";

const NOVA_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Crear", slugs: ["home", "conversacion", "musica", "imagenes", "documentos"] },
  { title: "Pensar", slugs: ["memoria", "automatizaciones", "calendario"] },
  { title: "Conectar", slugs: ["whatsapp", "finanzas", "ajustes"] },
];
const NEVIRA_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Operar", slugs: ["panel", "productividad", "automatizaciones", "comunicacion"] },
  { title: "Analizar", slugs: ["analisis", "datos", "memoria", "codigo"] },
  { title: "Proteger", slugs: ["seguridad", "sistema", "rendimiento"] },
];

function ModuleItem({ m, active, onSelect }: { m: ModuleDef; active: boolean; onSelect: () => void }) {
  const Icon = m.icon;
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <button onClick={onSelect} onPointerMove={onMove} className={`module-item w-full ${active ? "is-active" : ""}`}>
      <span className="module-bar" />
      <Icon3D className="h-9 w-9 shrink-0" active={active}>
        <Icon className="h-4 w-4" />
      </Icon3D>
      <div className="flex-1 min-w-0 text-left">
        <div className="module-label truncate">{m.label}</div>
        <div className="module-desc truncate">{m.description}</div>
      </div>
      {active && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

export function ModuleSidebar({
  assistant,
  active,
  onSelect,
  footer,
}: {
  assistant: "nova" | "nevira";
  active: string;
  onSelect: (slug: string) => void;
  footer?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const modules = getModules(assistant);
  const groups = assistant === "nova" ? NOVA_GROUPS : NEVIRA_GROUPS;
  const logo = assistant === "nova" ? novaLogo : neviraLogo;
  const brand = assistant === "nova" ? "NOVA" : "NEVIRA CORE";
  const email = user?.email ?? "invitado@nova.app";

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const swap = (target: "nova" | "nevira") => {
    if (target === assistant) return;
    navigate({ to: target === "nova" ? "/nova" : "/nevira" });
  };

  const findModule = (slug: string) => modules.find((m) => m.slug === slug);

  return (
    <aside className="liquid-glass sidebar-edge flex h-full w-72 shrink-0 flex-col border-r border-border/40 rounded-none">
      {/* brand */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <img src={logo} alt="" width={36} height={36} className="drop-shadow-[0_0_18px_var(--glow)]" />
        <div className="flex-1 min-w-0">
          <div className="font-display tracking-[0.25em] text-sm glow-text truncate">{brand}</div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            {assistant === "nova" ? "IA Creativa · Consciente" : "Estrategia · Precisión · Control"}
          </div>
        </div>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* assistant switcher */}
      <div className="px-3 pt-3">
        <div className="assistant-switch">
          <span className={`assistant-switch-thumb ${assistant === "nevira" ? "right" : ""}`} />
          <button onClick={() => swap("nova")} className={assistant === "nova" ? "active" : ""}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Nova
            </span>
          </button>
          <button onClick={() => swap("nevira")} className={assistant === "nevira" ? "active" : ""}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Cpu className="h-3 w-3" /> Nevira
            </span>
          </button>
        </div>
      </div>

      {/* grouped module list */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="sidebar-section-label">{g.title}</div>
            <div className="space-y-1">
              {g.slugs.map((slug) => {
                const m = findModule(slug);
                if (!m) return null;
                return <ModuleItem key={slug} m={m} active={slug === active} onSelect={() => onSelect(slug)} />;
              })}
            </div>
          </div>
        ))}
        <UserSections assistant={assistant} active={active} onSelect={onSelect} />
      </nav>

      {footer}

      {/* user */}
      <div className="flex items-center gap-3 border-t border-border/30 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 border border-primary/40">
          <UserIcon className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{email.split("@")[0]}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cuenta Premium</div>
        </div>
        <button onClick={signOut} title="Cerrar sesión" className="text-muted-foreground hover:text-primary transition">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function UserSections({
  assistant,
  active,
  onSelect,
}: {
  assistant: "nova" | "nevira";
  active: string;
  onSelect: (slug: string) => void;
}) {
  const { data: sections = [] } = useUserSections(assistant);
  const { remove } = useSectionMutations();
  const items = sections;
  return (
    <div>
      <div className="sidebar-section-label flex items-center justify-between">
        <span>Mías</span>
        <button
          onClick={() => onSelect("section:__new__")}
          title="Nueva sección (pídeselo al asistente)"
          className="grid h-5 w-5 place-items-center rounded border border-primary/30 text-primary/80 hover:bg-primary/15"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {items.length === 0 && (
        <div className="px-3 pb-2 text-[10px] text-muted-foreground">
          Pídele al asistente: “crea una sección para…”
        </div>
      )}
      <div className="space-y-1">
        {items.map((s) => {
          const slug = `section:${s.slug}`;
          const isActive = slug === active;
          return (
            <div key={s.id} className="group flex items-center gap-1">
              <button
                onClick={() => onSelect(slug)}
                className={`module-item flex-1 ${isActive ? "is-active" : ""}`}
              >
                <span className="module-bar" />
                <Icon3D className="h-9 w-9 shrink-0" active={isActive}>
                  <span className="text-sm">{s.icon || "✨"}</span>
                </Icon3D>
                <div className="flex-1 min-w-0 text-left">
                  <div className="module-label truncate">{s.label}</div>
                  <div className="module-desc truncate">
                    {s.created_by === "ai" ? "Creado por la IA" : "Personal"}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${s.label}"?`)) remove.mutate({ slug: s.slug });
                }}
                title="Eliminar"
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-400 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
