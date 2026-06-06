import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import novaLogo from "@/assets/nova-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acceso — NOVA & NEVIRA" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Entrando…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nova-bg min-h-screen flex items-center justify-center p-6">
      <div className="glass glow-ring relative w-full max-w-md rounded-3xl p-8 fade-up">
        <div className="flex flex-col items-center mb-8">
          <img src={novaLogo} alt="" width={80} height={80} className="drop-shadow-[0_0_30px_var(--glow)]" />
          <h1 className="mt-3 text-2xl font-display tracking-wide glow-text">NOVA · NEVIRA</h1>
          <p className="text-sm text-muted-foreground mt-1">Asistentes inteligentes</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 w-full text-sm text-muted-foreground hover:text-primary transition"
        >
          {mode === "login" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta, iniciar sesión"}
        </button>
      </div>
    </div>
  );
}
