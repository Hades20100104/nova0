import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Music, Image as ImageIcon, MessageCircle, Brain, LogOut, Sparkles, Bell, Calendar, Settings, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeSwitch } from "@/components/ThemeSwitch";

interface MenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeName: "NEVIRA" | "NOVA";
  theme: "nevira" | "nova";
  userName: string | null;
  notesCount: number;
  onThemeChange: (theme: "nevira" | "nova") => void;
  onSection: (section: "music" | "images" | "whatsapp" | "settings" | "docs") => void;
  onClearMemory: () => void;
  onLogout: () => void;
}

export function MenuDrawer({
  open, onOpenChange, themeName, theme, userName, notesCount,
  onThemeChange, onSection, onClearMemory, onLogout,
}: MenuDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-card/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Menú de {themeName}
          </SheetTitle>
          <SheetDescription>
            Hola {userName ?? "tú"}, esto es lo que puedo hacer por ti.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tema */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Apariencia</h3>
            <div className="rounded-xl border border-border bg-card/50 p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Modo {theme === "nova" ? "Noche" : "Día"}</div>
                <div className="text-xs text-muted-foreground">Cambia entre NEVIRA y NOVA</div>
              </div>
              <ThemeSwitch theme={theme} onChange={onThemeChange} />
            </div>
          </section>

          {/* Funciones */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Funciones</h3>
            <div className="grid grid-cols-2 gap-2">
              <MenuTile icon={Music} label="Música" desc="Spotify Premium" onClick={() => onSection("music")} />
              <MenuTile icon={ImageIcon} label="Imágenes" desc="Generar con IA" onClick={() => onSection("images")} />
              <MenuTile icon={MessageCircle} label="WhatsApp" desc="Enviar por voz" onClick={() => onSection("whatsapp")} />
              <Link to="/gallery" onClick={() => onOpenChange(false)} className="block">
                <MenuTile icon={ImageIcon} label="Mi galería" desc="Imágenes guardadas" />
              </Link>
              <MenuTile icon={Settings} label="Ajustes" desc="Playlists y contactos" onClick={() => onSection("settings")} />
              <MenuTile icon={FileText} label="Docs" desc="Word, Excel y PowerPoint" onClick={() => onSection("docs")} />
              <MenuTile icon={Bell} label="Recordatorios" desc="Próximamente" disabled />
              <MenuTile icon={Calendar} label="Calendario" desc="Próximamente" disabled />
            </div>
          </section>

          {/* Memoria */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Memoria</h3>
            <div className="rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{notesCount} notas guardadas</div>
                  <div className="text-xs text-muted-foreground">Cosas que sé sobre ti</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onClearMemory}>
                Borrar memoria
              </Button>
            </div>
          </section>

          {/* Sesión */}
          <section className="pt-2">
            <Button variant="destructive" className="w-full" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuTile({
  icon: Icon, label, desc, onClick, disabled,
}: {
  icon: typeof Music; label: string; desc: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-1 rounded-xl border border-border bg-card/50 p-3 text-left transition-all hover:border-primary/60 hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="h-5 w-5 text-primary" />
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
