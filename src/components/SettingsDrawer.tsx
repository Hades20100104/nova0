import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Phone, Plus, Trash2, Play, ChevronLeft, ListMusic, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchContacts, addContact, deleteContact, normalizePhone, type WhatsAppContact,
} from "@/lib/contacts";
import {
  fetchPlaylists, createPlaylist, deletePlaylist,
  fetchTracks, addTrack, deleteTrack,
  type Playlist, type PlaylistTrack,
} from "@/lib/playlists";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  spotifyConnected: boolean;
  onPlayPlaylist: (queries: string[], name: string) => void;
}

type View = "menu" | "playlists" | "playlist-detail" | "contacts";

export function SettingsDrawer({ open, onOpenChange, userId, spotifyConnected, onPlayPlaylist }: SettingsDrawerProps) {
  const [view, setView] = useState<View>("menu");
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setView("menu"); setActivePlaylist(null); }, 250);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-card/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            {view !== "menu" && (
              <button
                type="button"
                onClick={() => setView(view === "playlist-detail" ? "playlists" : "menu")}
                className="rounded-md p-1 hover:bg-muted"
                aria-label="Atrás"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            Ajustes
          </SheetTitle>
          <SheetDescription>
            Personaliza tus playlists y contactos de WhatsApp.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {view === "menu" && (
            <div className="space-y-2">
              <SettingsTile
                icon={ListMusic}
                label="Mis playlists"
                desc="Crea listas que se reproducen solas"
                onClick={() => setView("playlists")}
              />
              <SettingsTile
                icon={Phone}
                label="Contactos de WhatsApp"
                desc="Manda mensajes diciendo solo el nombre"
                onClick={() => setView("contacts")}
              />
            </div>
          )}

          {view === "playlists" && (
            <PlaylistsView
              userId={userId}
              onOpen={(p) => { setActivePlaylist(p); setView("playlist-detail"); }}
            />
          )}

          {view === "playlist-detail" && activePlaylist && (
            <PlaylistDetailView
              userId={userId}
              playlist={activePlaylist}
              spotifyConnected={spotifyConnected}
              onPlay={(queries) => {
                onOpenChange(false);
                onPlayPlaylist(queries, activePlaylist.name);
              }}
            />
          )}

          {view === "contacts" && <ContactsView userId={userId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingsTile({
  icon: Icon, label, desc, onClick,
}: { icon: typeof Music; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/50 p-3 text-left transition-all hover:border-primary/60 hover:bg-card"
    >
      <Icon className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

/* -------------------- PLAYLISTS -------------------- */

function PlaylistsView({ userId, onOpen }: { userId: string; onOpen: (p: Playlist) => void }) {
  const [items, setItems] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setItems(await fetchPlaylists(userId));
      setLoading(false);
    })();
  }, [userId]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 60) { toast.error("Nombre demasiado largo"); return; }
    try {
      const pl = await createPlaylist(userId, trimmed);
      setItems((xs) => [...xs, pl]);
      setName("");
      toast.success("Playlist creada");
    } catch (e) {
      console.error(e);
      toast.error("No pude crear la playlist");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar esta playlist?")) return;
    try {
      await deletePlaylist(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch {
      toast.error("No pude borrarla");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la playlist"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tienes playlists. Crea la primera arriba.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((pl) => (
            <li key={pl.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/50 p-3">
              <button type="button" onClick={() => onOpen(pl)} className="flex-1 text-left">
                <div className="text-sm font-medium">{pl.name}</div>
                <div className="text-xs text-muted-foreground">Toca para ver canciones</div>
              </button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(pl.id)} aria-label="Borrar">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaylistDetailView({
  userId, playlist, spotifyConnected, onPlay,
}: { userId: string; playlist: Playlist; spotifyConnected: boolean; onPlay: (queries: string[]) => void }) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setTracks(await fetchTracks(playlist.id));
      setLoading(false);
    })();
  }, [playlist.id]);

  const handleAdd = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (trimmed.length > 200) { toast.error("Texto demasiado largo"); return; }
    try {
      const tr = await addTrack(userId, playlist.id, trimmed, tracks.length);
      setTracks((xs) => [...xs, tr]);
      setQuery("");
    } catch {
      toast.error("No pude añadir la canción");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrack(id);
      setTracks((xs) => xs.filter((x) => x.id !== id));
    } catch {
      toast.error("No pude borrarla");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{playlist.name}</h3>
        <p className="text-xs text-muted-foreground">
          Las canciones se reproducirán en orden y la siguiente empezará automáticamente al terminar la anterior.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder='Ej: "Bad Bunny - Tití me preguntó"'
          value={query}
          maxLength={200}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
        disabled={tracks.length === 0 || !spotifyConnected}
        onClick={() => onPlay(tracks.map((t) => t.query))}
      >
        <Play className="mr-2 h-4 w-4" />
        {spotifyConnected ? "Reproducir" : "Conecta Spotify primero"}
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay canciones. Añade la primera arriba.</p>
      ) : (
        <ol className="space-y-2">
          {tracks.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-card/50 p-3">
              <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
              <span className="flex-1 truncate text-sm">{t.query}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} aria-label="Borrar">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* -------------------- CONTACTOS -------------------- */

function ContactsView({ userId }: { userId: string }) {
  const [items, setItems] = useState<WhatsAppContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setItems(await fetchContacts(userId));
      setLoading(false);
    })();
  }, [userId]);

  const handleAdd = async () => {
    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) { toast.error("Nombre y teléfono son obligatorios"); return; }
    if (n.length > 60) { toast.error("Nombre demasiado largo"); return; }
    const clean = normalizePhone(p);
    if (clean.replace("+", "").length < 7) { toast.error("Número inválido"); return; }
    try {
      const c = await addContact(userId, n, p);
      setItems((xs) => [...xs, c].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setPhone("");
      toast.success(`${c.name} añadido`);
    } catch {
      toast.error("No pude guardar el contacto");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch {
      toast.error("No pude borrarlo");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          placeholder="Nombre (ej. Mamá)"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="+52 55 1234 5678"
            value={phone}
            maxLength={20}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd}><UserPlus className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: incluye el código de país (ej. <span className="font-mono">+52</span>). Después podrás decir
        “WhatsApp a <span className="font-medium">Mamá</span> diciendo hola”.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tienes contactos.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/50 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{c.phone}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} aria-label="Borrar">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
