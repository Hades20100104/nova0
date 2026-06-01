import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listSkills, toggleSkill, deleteSkill } from "@/server/skills.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Code2 } from "lucide-react";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  enabled: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export function SkillsManager() {
  const list = useServerFn(listSkills);
  const toggle = useServerFn(toggleSkill);
  const remove = useServerFn(deleteSkill);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = (await list({})) as { skills: Skill[] };
        setSkills(r.skills);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [list]);

  const handleToggle = async (s: Skill) => {
    const next = !s.enabled;
    setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, enabled: next } : x)));
    try {
      await toggle({ data: { id: s.id, enabled: next } });
    } catch {
      toast.error("No pude actualizar el skill");
      setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, enabled: !next } : x)));
    }
  };

  const handleDelete = async (s: Skill) => {
    if (!confirm(`¿Borrar el skill "${s.name}"?`)) return;
    try {
      await remove({ data: { id: s.id } });
      setSkills((xs) => xs.filter((x) => x.id !== s.id));
    } catch {
      toast.error("No pude borrarlo");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Skills que tu asistente ha aprendido. Cuando inventa una solución útil con código, la guarda
        aquí y la reutiliza en próximas conversaciones.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Aún no hay skills. Pídele algo nuevo y, si se le ocurre una solución reutilizable, la
            guardará aquí automáticamente.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {skills.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-card/50 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Usado {s.usage_count} {s.usage_count === 1 ? "vez" : "veces"}
                  </div>
                </div>
                <Switch checked={s.enabled} onCheckedChange={() => handleToggle(s)} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <Code2 className="mr-1 h-3 w-3" />
                  {expanded === s.id ? "Ocultar código" : "Ver código"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDelete(s)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Borrar
                </Button>
              </div>
              {expanded === s.id && (
                <pre className="max-h-48 overflow-auto rounded-md border border-border bg-background/60 p-2 text-[10px] leading-relaxed">
                  <code>{s.code}</code>
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
