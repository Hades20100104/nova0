import { useState } from "react";
import { useMerlinAccess, useUnlockMerlin } from "@/lib/merlin-data";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Unlock, Loader2 } from "lucide-react";

export function MerlinUnlock() {
  const { data } = useMerlinAccess();
  const unlock = useUnlockMerlin();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const unlocked = data?.unlocked;

  return (
    <section className="liquid-glass rounded-2xl border border-primary/25 p-4">
      <header className="mb-2 flex items-center gap-2">
        {unlocked ? <Unlock className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-primary" />}
        <h3 className="font-display text-sm uppercase tracking-[0.25em] glow-text">Miembro oculto</h3>
      </header>
      {unlocked ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">MERLIN está desbloqueado en este perfil.</p>
          <button onClick={() => navigate({ to: "/merlin" })} className="rounded-lg border border-primary/50 bg-primary/15 px-3 py-2 text-xs uppercase tracking-widest hover:bg-primary/25">
            Abrir Merlin
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Introduce la contraseña para activar al tercer integrante.</p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(false); }}
              placeholder="Contraseña"
              className="flex-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <button
              onClick={() => unlock.mutate(pwd, { onSuccess: (r) => (r.ok ? navigate({ to: "/merlin" }) : setError(true)) })}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-3 py-2 text-xs uppercase tracking-widest hover:bg-primary/25"
            >
              {unlock.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Desbloquear
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">Contraseña incorrecta.</p>}
        </>
      )}
    </section>
  );
}
