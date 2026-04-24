import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Phone, Plus, Trash2, Play, ChevronLeft, ListMusic, UserPlus, WandSparkles, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateDocument, listDocuments, downloadDocument, deleteDocument } from "@/server/docs.functions";
import {
  fetchContacts, addContact, deleteContact, normalizePhone, type WhatsAppContact,
} from "@/lib/contacts";
import {
  fetchPlaylists, createPlaylist, deletePlaylist,
  fetchTracks, addTrack, deleteTrack,
  type Playlist, type PlaylistTrack,
} from "@/lib/playlists";

export interface ArtistSuggestion {
  id: string;
  name: string;
  image: string | null;
  followers: number;
}

export interface ArtistResolutionLog {
  artist: string;
  resolvedAs: string | null;
  tracks: number;
  reason?: string;
}

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  spotifyConnected: boolean;
  onPlayPlaylist: (queries: string[], name: string) => void;
  onGeneratePlaylistFromArtists: (artists: string[]) => Promise<{ queries: string[]; log: ArtistResolutionLog[] }>;
  onSearchArtists: (query: string) => Promise<ArtistSuggestion[]>;
  themeName: "NEVIRA" | "NOVA";
  initialView?: "menu" | "playlists" | "playlist-detail" | "contacts" | "docs";
}

type View = "menu" | "playlists" | "playlist-detail" | "contacts" | "docs";

export function SettingsDrawer({ open, onOpenChange, userId, spotifyConnected, onPlayPlaylist, onGeneratePlaylistFromArtists, onSearchArtists, themeName, initialView = "menu" }: SettingsDrawerProps) {
  const [view, setView] = useState<View>(initialView);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setView("menu"); setActivePlaylist(null); }, 250);
    } else {
      setView(initialView);
    }
  }, [initialView, open]);

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
              <SettingsTile
                icon={FileText}
                label="Docs"
                desc="Genera Word, Excel o PowerPoint"
                onClick={() => setView("docs")}
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
              onGeneratePlaylistFromArtists={onGeneratePlaylistFromArtists}
              onSearchArtists={onSearchArtists}
              onPlay={(queries) => {
                onOpenChange(false);
                onPlayPlaylist(queries, activePlaylist.name);
              }}
            />
          )}

          {view === "contacts" && <ContactsView userId={userId} />}

          {view === "docs" && <DocsView themeName={themeName} />}
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
  userId, playlist, spotifyConnected, onPlay, onGeneratePlaylistFromArtists, onSearchArtists,
}: { userId: string; playlist: Playlist; spotifyConnected: boolean; onPlay: (queries: string[]) => void; onGeneratePlaylistFromArtists: (artists: string[]) => Promise<{ queries: string[]; log: ArtistResolutionLog[] }>; onSearchArtists: (query: string) => Promise<ArtistSuggestion[]> }) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [query, setQuery] = useState("");
  const [artistsSeed, setArtistsSeed] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastLog, setLastLog] = useState<ArtistResolutionLog[]>([]);
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [searchingArtists, setSearchingArtists] = useState(false);

  useEffect(() => {
    (async () => {
      setTracks(await fetchTracks(playlist.id));
      setLoading(false);
    })();
  }, [playlist.id]);

  // Autocompletado: extrae el último fragmento (después de la última coma) y lo busca
  useEffect(() => {
    if (!spotifyConnected) { setSuggestions([]); return; }
    const lastFragment = artistsSeed.split(",").pop()?.trim() ?? "";
    if (lastFragment.length < 2) { setSuggestions([]); return; }
    const handle = setTimeout(async () => {
      setSearchingArtists(true);
      try {
        const results = await onSearchArtists(lastFragment);
        setSuggestions(results);
      } finally {
        setSearchingArtists(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [artistsSeed, onSearchArtists, spotifyConnected]);

  const pickSuggestion = (artist: ArtistSuggestion) => {
    const parts = artistsSeed.split(",").map((p) => p.trim());
    parts[parts.length - 1] = artist.name;
    setArtistsSeed(parts.filter(Boolean).join(", ") + ", ");
    setSuggestions([]);
  };

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

  const handleGenerateFromArtists = async () => {
    const artists = artistsSeed.split(",").map((artist) => artist.trim()).filter(Boolean);
    if (artists.length === 0) {
      toast.error("Escribe al menos un artista");
      return;
    }
    setGenerating(true);
    setLastLog([]);
    try {
      const { queries: generated, log } = await onGeneratePlaylistFromArtists(artists);
      setLastLog(log);
      if (generated.length === 0) {
        const failedNames = log.filter((l) => l.tracks === 0).map((l) => l.artist).join(", ");
        toast.error(failedNames ? `No encontré canciones de: ${failedNames}` : "No pude generar canciones con esos artistas");
        return;
      }
      const existing = new Set(tracks.map((track) => track.query.toLowerCase()));
      const toInsert = generated.filter((item) => !existing.has(item.toLowerCase()));
      if (toInsert.length === 0) {
        toast.error("Esas canciones ya estaban en la playlist");
        return;
      }

      const created: PlaylistTrack[] = [];
      for (const [offset, item] of toInsert.entries()) {
        const row = await addTrack(userId, playlist.id, item, tracks.length + offset);
        created.push(row);
      }
      setTracks((xs) => [...xs, ...created]);
      setArtistsSeed("");
      toast.success(`Añadí ${created.length} canciones`);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "No pude generar la playlist desde artistas";
      toast.error(msg);
    } finally {
      setGenerating(false);
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

      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <WandSparkles className="h-4 w-4 text-primary" />
          Crear desde artistas
        </div>
        <div className="relative">
          <Input
            placeholder="Ej: Arcángel, Bad Bunny, Feid"
            value={artistsSeed}
            maxLength={180}
            onChange={(e) => setArtistsSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateFromArtists()}
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(a)}
                    className="flex w-full items-center gap-2 p-2 text-left hover:bg-muted"
                  >
                    {a.image ? (
                      <img src={a.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.followers.toLocaleString()} seguidores</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchingArtists && (
            <p className="absolute right-2 top-2 text-xs text-muted-foreground">Buscando…</p>
          )}
        </div>
        <Button variant="outline" className="w-full" onClick={handleGenerateFromArtists} disabled={generating}>
          {generating ? "Generando…" : "Generar playlist"}
        </Button>
        {lastLog.length > 0 && (
          <div className="rounded-lg border border-border bg-background/40 p-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Resultado:</p>
            {lastLog.map((entry, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{entry.artist}</span>{" "}
                {entry.resolvedAs && entry.resolvedAs.toLowerCase() !== entry.artist.toLowerCase() && (
                  <span className="text-muted-foreground">→ {entry.resolvedAs}</span>
                )}{" "}
                {entry.tracks > 0 ? (
                  <span className="text-primary">✓ {entry.tracks} canciones</span>
                ) : (
                  <span className="text-destructive">✗ {entry.reason ?? "sin tracks"}</span>
                )}
              </div>
            ))}
          </div>
        )}
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

interface DocHistoryItem {
  id: string;
  format: "docx" | "xlsx" | "pptx";
  title: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

function DocsView({ themeName }: { themeName: "NEVIRA" | "NOVA" }) {
  const docFn = useServerFn(generateDocument);
  const listFn = useServerFn(listDocuments);
  const downloadFn = useServerFn(downloadDocument);
  const deleteFn = useServerFn(deleteDocument);
  const [format, setFormat] = useState<"docx" | "xlsx" | "pptx">("docx");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DocHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const downloadBase64 = (base64: string, mimeType: string, fileName: string) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const reloadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await listFn({});
      setHistory(res.items);
    } catch {
      // silencio: el historial no es crítico
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { void reloadHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleGenerate = async () => {
    if (prompt.trim().length < 6) {
      toast.error("Describe un poco más el documento");
      return;
    }
    setLoading(true);
    try {
      const res = await docFn({ data: { format, prompt: prompt.trim(), themeName } });
      downloadBase64(res.base64, res.mimeType, res.fileName);
      toast.success(`${res.title} listo para descargar`);
      void reloadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude generar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleRedownload = async (item: DocHistoryItem) => {
    try {
      const res = await downloadFn({ data: { id: item.id } });
      downloadBase64(res.base64, res.mimeType, res.fileName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude descargar el archivo");
    }
  };

  const handleHistoryDelete = async (id: string) => {
    if (!confirm("¿Borrar este documento del historial?")) return;
    try {
      await deleteFn({ data: { id } });
      setHistory((xs) => xs.filter((x) => x.id !== id));
    } catch {
      toast.error("No pude borrarlo");
    }
  };

  const formatLabel: Record<DocHistoryItem["format"], string> = {
    docx: "Word",
    xlsx: "Excel",
    pptx: "PowerPoint",
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Generador de Docs</h3>
        <p className="text-xs text-muted-foreground">Crea archivos descargables para reportes, tablas, presentaciones y resúmenes.</p>
      </div>

      <Select value={format} onValueChange={(value: "docx" | "xlsx" | "pptx") => setFormat(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Formato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="docx">Word (.docx)</SelectItem>
          <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
          <SelectItem value="pptx">PowerPoint (.pptx)</SelectItem>
        </SelectContent>
      </Select>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ej: Hazme un PowerPoint de ventas del mes con objetivos, métricas y próximos pasos"
        className="min-h-32"
      />

      <div className="rounded-xl border border-border bg-card/50 p-3 text-xs text-muted-foreground">
        Útil para: propuestas, reportes, tablas comparativas, resúmenes ejecutivos, presupuestos y presentaciones rápidas.
      </div>

      <Button className="w-full" onClick={handleGenerate} disabled={loading}>
        <Download className="mr-2 h-4 w-4" />
        {loading ? "Generando…" : "Generar archivo"}
      </Button>

      <div className="pt-2">
        <h4 className="mb-2 text-sm font-semibold">Tus últimos documentos</h4>
        {historyLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aquí aparecerán los documentos que generes para volver a descargarlos.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-card/50 p-3">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatLabel[item.format]} · {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRedownload(item)} aria-label="Descargar">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleHistoryDelete(item.id)} aria-label="Borrar">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
