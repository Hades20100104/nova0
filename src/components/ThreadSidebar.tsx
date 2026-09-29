import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Thread = { id: string; title: string; module: string; updated_at: string };

export function ThreadSidebar({
  assistant,
  activeThreadId,
  module,
}: {
  assistant: "nova" | "nevira";
  activeThreadId?: string;
  module: string;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const [threads, setThreads] = useState<Thread[]>([]);

  const refresh = async () => {
    try {
      const res = await list({ data: { assistant } });
      setThreads(res.threads as Thread[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [assistant, activeThreadId]);

  const handleCreate = async () => {
    try {
      const res = await create({ data: { assistant, module, title: "Nueva conversación" } });
      await refresh();
      navigate({ to: assistant === "nova" ? "/nova/$threadId" : "/nevira/$threadId", params: { threadId: res.thread!.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del({ data: { threadId: id } });
      if (id === activeThreadId) navigate({ to: assistant === "nova" ? "/nova" : "/nevira" });
      await refresh();
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <aside className="glass flex h-full w-72 shrink-0 flex-col border-r border-border/50">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Cambiar
        </button>
        <button onClick={signOut} className="text-muted-foreground hover:text-primary transition" title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <Button onClick={handleCreate} className="w-full justify-start gap-2" variant="default">
          <Plus className="h-4 w-4" /> Nueva conversación
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {threads.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Aún no hay conversaciones.</p>
        )}
        {threads.map((t) => {
          const isActive = t.id === activeThreadId;
          return (
            <div key={t.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition ${isActive ? "bg-primary/20" : "hover:bg-primary/10"}`}>
              <button
                onClick={() => navigate({ to: assistant === "nova" ? "/nova/$threadId" : "/nevira/$threadId", params: { threadId: t.id } })}
                className="flex-1 text-left text-sm truncate"
              >
                <div className="truncate font-medium">{t.title}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.module}</div>
              </button>
              <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
