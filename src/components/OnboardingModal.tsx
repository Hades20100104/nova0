import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  themeName: "NEVIRA" | "NOVA";
  onSubmit: (name: string) => void;
}

/**
 * Modal de bienvenida que se abre la PRIMERA VEZ que se usa la app.
 * Pregunta cómo quiere el usuario que la IA lo llame y guarda el nombre.
 * Una vez fijado, no se vuelve a preguntar (la IA tampoco lo cambiará por su
 * cuenta).
 */
export function OnboardingModal({ open, themeName, onSubmit }: OnboardingModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md border-border bg-card/95 backdrop-blur-xl shadow-glow"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Hola, soy <span className="text-gradient">{themeName}</span>
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Antes de empezar, ¿cómo quieres que te llame?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o como quieras que te llame…"
            className="h-12 bg-input/50 text-center text-lg"
            maxLength={40}
          />
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90"
            disabled={!name.trim() || submitting}
          >
            {submitting ? "Guardando…" : "Empezar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Recordaré este nombre y no lo cambiaré hasta que tú me lo pidas.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
