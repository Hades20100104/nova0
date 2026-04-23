import { Download, Loader2 } from "lucide-react";

interface ImageMessageProps {
  prompt: string;
  url: string | null; // null = loading
  onDownload?: () => void;
}

export function ImageMessage({ prompt, url, onDownload }: ImageMessageProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 backdrop-blur space-y-2">
      <div className="text-xs text-muted-foreground italic">"{prompt}"</div>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {url ? (
          <img src={url} alt={prompt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs">Creando imagen…</span>
          </div>
        )}
      </div>
      {url && onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/40 py-2 text-xs font-medium hover:bg-background/70"
        >
          <Download className="h-3.5 w-3.5" /> Descargar
        </button>
      )}
    </div>
  );
}
