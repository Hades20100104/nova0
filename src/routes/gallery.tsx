import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, Download, ImageOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/gallery")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Mi galería — NEVIRA & NOVA" }],
  }),
  component: GalleryPage,
});

interface ImageRow {
  id: string;
  prompt: string;
  storage_path: string;
  public_url: string;
  created_at: string;
  signedUrl?: string;
}

function GalleryPage() {
  const [images, setImages] = useState<ImageRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("generated_images")
      .select("id, prompt, storage_path, public_url, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No pude cargar tu galería");
      setLoading(false);
      return;
    }
    // Firmar URLs (bucket privado)
    const withSigned: ImageRow[] = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
          .from("generated-images")
          .createSignedUrl(row.storage_path, 60 * 60);
        return { ...row, signedUrl: signed?.signedUrl ?? row.public_url };
      }),
    );
    setImages(withSigned);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (img: ImageRow) => {
    if (!confirm("¿Borrar esta imagen para siempre?")) return;
    await supabase.storage.from("generated-images").remove([img.storage_path]);
    const { error } = await supabase.from("generated_images").delete().eq("id", img.id);
    if (error) {
      toast.error("No se pudo borrar");
      return;
    }
    setImages((prev) => prev?.filter((i) => i.id !== img.id) ?? null);
    toast.success("Imagen borrada");
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <header className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-3 backdrop-blur lg:px-8">
        <Link to="/" className="rounded-full p-2 hover:bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Mi galería</h1>
          <p className="text-xs text-muted-foreground">Imágenes generadas con IA</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageOff className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Aún no has creado imágenes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pídele al asistente: <em>"Genera una imagen de…"</em>
            </p>
            <Link to="/" className="mt-6">
              <Button>Volver al asistente</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-2xl border border-border bg-card/60 overflow-hidden"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  <img
                    src={img.signedUrl}
                    alt={img.prompt}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="line-clamp-2 text-xs text-muted-foreground italic">
                    "{img.prompt}"
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={img.signedUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-background/40 py-1.5 text-xs hover:bg-background/70"
                    >
                      <Download className="h-3 w-3" /> Descargar
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(img)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
