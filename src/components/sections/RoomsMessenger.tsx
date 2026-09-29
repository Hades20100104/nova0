import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search, Send, Sparkles, Users, LogOut, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  searchUsers,
  setMyUsername,
  listMyRooms,
  createDm,
  createGroup,
  getRoom,
  listMessages,
  sendMessage,
  toggleAi,
  invokeAiInRoom,
  leaveRoom,
} from "@/lib/rooms.functions";

type Peer = { id: string; username: string | null; display_name: string | null };

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function RoomsMessenger({ assistant }: { assistant: "nova" | "nevira" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const fnRooms = useServerFn(listMyRooms);
  const fnRoom = useServerFn(getRoom);
  const fnMsgs = useServerFn(listMessages);
  const fnSend = useServerFn(sendMessage);
  const fnToggle = useServerFn(toggleAi);
  const fnInvoke = useServerFn(invokeAiInRoom);
  const fnLeave = useServerFn(leaveRoom);

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => fnRooms({}) });
  const room = useQuery({
    queryKey: ["room", activeRoom],
    enabled: !!activeRoom,
    queryFn: () => fnRoom({ data: { room_id: activeRoom! } }),
  });
  const messages = useQuery({
    queryKey: ["room-messages", activeRoom],
    enabled: !!activeRoom,
    queryFn: () => fnMsgs({ data: { room_id: activeRoom!, limit: 120 } }),
  });

  // realtime
  useEffect(() => {
    if (!activeRoom) return;
    const channel = supabase
      .channel(`room-${activeRoom}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_room_messages",
          filter: `room_id=eq.${activeRoom}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["room-messages", activeRoom] });
          qc.invalidateQueries({ queryKey: ["rooms"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  const send = useMutation({
    mutationFn: async (body: string) => fnSend({ data: { room_id: activeRoom!, body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["room-messages", activeRoom] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileById = useMemo(() => {
    const map = new Map<string, Peer>();
    for (const p of (room.data?.profiles ?? []) as Peer[]) map.set(p.id, p);
    return map;
  }, [room.data]);

  const roomInfo = room.data?.room as
    | {
        id: string;
        kind: string;
        name: string | null;
        ai_enabled: boolean;
        ai_assistant: "nova" | "nevira" | null;
      }
    | undefined;

  const roomTitle = (r: {
    kind: string;
    name: string | null;
    peer?: { display_name: string | null; username: string | null } | null;
  }) =>
    r.kind === "group"
      ? (r.name ?? "Grupo")
      : (r.peer?.display_name ?? (r.peer?.username ? `@${r.peer.username}` : "Chat directo"));

  return (
    <div className="grid grid-cols-12 gap-4 h-[560px]">
      {/* sidebar */}
      <aside className="col-span-12 md:col-span-4 rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-xl flex flex-col overflow-hidden">
        <div className="p-3 flex items-center justify-between border-b border-primary/20">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-mono">
            Salas
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 transition"
          >
            <Plus className="h-3 w-3" /> Nuevo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.isLoading && (
            <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </div>
          )}
          {rooms.data?.rooms?.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">
              Aún no tienes conversaciones. Pulsa “Nuevo” y busca a alguien por @usuario.
            </p>
          )}
          {(rooms.data?.rooms ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoom(r.id)}
              className={`w-full text-left rounded-xl px-3 py-2 flex items-center gap-3 transition border ${
                activeRoom === r.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-transparent hover:bg-primary/5"
              }`}
            >
              <span className="h-9 w-9 shrink-0 rounded-full grid place-items-center border border-primary/40 bg-primary/10 text-[11px] font-mono">
                {r.kind === "group" ? <Users className="h-4 w-4" /> : initials(roomTitle(r))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm truncate">{roomTitle(r)}</span>
                <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.kind === "group" ? "Grupo" : "Directo"}
                  {r.ai_enabled ? ` · IA ${(r.ai_assistant ?? "").toUpperCase()}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* conversation */}
      <section className="col-span-12 md:col-span-8 rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-xl flex flex-col overflow-hidden">
        {!activeRoom ? (
          <div className="flex-1 grid place-items-center text-center px-6">
            <div>
              <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Selecciona una sala o crea una nueva para empezar a hablar con otros usuarios.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="p-3 border-b border-primary/20 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">
                  {roomInfo?.kind === "group" ? (roomInfo?.name ?? "Grupo") : "Chat directo"}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {(room.data?.members ?? []).length} miembro(s)
                </div>
              </div>
              <button
                onClick={async () => {
                  await fnToggle({
                    data: {
                      room_id: activeRoom,
                      enabled: !roomInfo?.ai_enabled,
                      assistant,
                    },
                  });
                  room.refetch();
                }}
                className={`text-[10px] uppercase tracking-widest rounded-lg border px-2 py-1 transition ${
                  roomInfo?.ai_enabled
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-primary/30 text-muted-foreground hover:text-primary"
                }`}
              >
                <Bot className="h-3 w-3 inline mr-1" />
                IA {roomInfo?.ai_enabled ? "on" : "off"}
              </button>
              {roomInfo?.ai_enabled && (
                <button
                  onClick={async () => {
                    try {
                      await fnInvoke({ data: { room_id: activeRoom } });
                      messages.refetch();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Error");
                    }
                  }}
                  className="text-[10px] uppercase tracking-widest rounded-lg border border-primary/40 px-2 py-1 text-primary hover:bg-primary/10"
                >
                  Invocar
                </button>
              )}
              <button
                title="Salir de la sala"
                aria-label="Salir de la sala"
                onClick={async () => {
                  await fnLeave({ data: { room_id: activeRoom } });
                  setActiveRoom(null);
                  qc.invalidateQueries({ queryKey: ["rooms"] });
                }}
                className="text-muted-foreground hover:text-destructive transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(messages.data?.messages ?? []).map((m) => {
                const mine = m.sender_id === user?.id;
                const isAi = m.sender_kind === "ai";
                const author = isAi
                  ? (m.ai_name ?? "IA")
                  : (profileById.get(m.sender_id ?? "")?.display_name ??
                    profileById.get(m.sender_id ?? "")?.username ??
                    "Usuario");
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 border text-sm whitespace-pre-wrap ${
                        mine
                          ? "border-primary/50 bg-primary/15"
                          : isAi
                            ? "border-primary/40 bg-primary/5"
                            : "border-primary/20 bg-card/60"
                      }`}
                    >
                      {!mine && (
                        <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-0.5 font-mono">
                          {author}
                        </div>
                      )}
                      {m.body}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form
              className="p-3 border-t border-primary/20 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send.mutate(text.trim());
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Mensaje"
                placeholder={
                  roomInfo?.ai_enabled ? "Escribe… menciona @nova o @nevira" : "Escribe un mensaje…"
                }
                className="flex-1 bg-transparent border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={send.isPending || !text.trim()}
                className="rounded-xl border border-primary/50 bg-primary/15 px-3 py-2 text-primary disabled:opacity-40"
                aria-label="Enviar"
              >
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </>
        )}
      </section>

      {composerOpen && (
        <NewRoomDialog
          onClose={() => setComposerOpen(false)}
          onCreated={(id) => {
            setComposerOpen(false);
            setActiveRoom(id);
            qc.invalidateQueries({ queryKey: ["rooms"] });
          }}
        />
      )}
    </div>
  );
}

function NewRoomDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (roomId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Peer[]>([]);
  const [selected, setSelected] = useState<Peer[]>([]);
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const fnSearch = useServerFn(searchUsers);
  const fnDm = useServerFn(createDm);
  const fnGroup = useServerFn(createGroup);
  const fnUsername = useServerFn(setMyUsername);

  const doSearch = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fnSearch({ data: { q: q.trim() } });
      setResults(r.users as Peer[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-primary/40 bg-card/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display tracking-[0.25em] text-sm uppercase glow-text">
            Nueva conversación
          </h3>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Cerrar
          </button>
        </div>

        <div className="rounded-xl border border-primary/25 p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Tu @usuario (para que te encuentren)
          </div>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="mi_usuario"
              aria-label="Definir mi usuario"
              className="flex-1 bg-transparent border border-primary/30 rounded-lg px-3 py-1.5 text-sm outline-none"
            />
            <button
              onClick={async () => {
                try {
                  await fnUsername({ data: { username } });
                  toast.success("Usuario guardado");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Error");
                }
              }}
              className="rounded-lg border border-primary/40 px-3 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
            >
              Guardar
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Buscar @usuario o nombre"
            aria-label="Buscar usuarios"
            className="flex-1 bg-transparent border border-primary/30 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={doSearch}
            className="rounded-lg border border-primary/40 px-3 text-primary hover:bg-primary/10"
            aria-label="Buscar"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map((u) => {
            const on = selected.some((s) => s.id === u.id);
            return (
              <button
                key={u.id}
                onClick={() =>
                  setSelected((prev) => (on ? prev.filter((p) => p.id !== u.id) : [...prev, u]))
                }
                className={`w-full text-left rounded-lg px-3 py-2 border text-sm transition ${
                  on ? "border-primary/60 bg-primary/10" : "border-primary/20 hover:bg-primary/5"
                }`}
              >
                {u.display_name ?? "Usuario"}{" "}
                <span className="text-[10px] font-mono text-muted-foreground">
                  {u.username ? `@${u.username}` : ""}
                </span>
              </button>
            );
          })}
          {!results.length && (
            <p className="text-xs text-muted-foreground px-1">
              Busca a otros usuarios de la app por su @usuario.
            </p>
          )}
        </div>

        {selected.length > 1 && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nombre del grupo"
            aria-label="Nombre del grupo"
            className="w-full bg-transparent border border-primary/30 rounded-lg px-3 py-2 text-sm outline-none"
          />
        )}

        <button
          disabled={!selected.length || busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (selected.length === 1) {
                const r = await fnDm({ data: { peer_id: selected[0].id } });
                onCreated(r.room_id);
              } else {
                const r = await fnGroup({
                  data: {
                    name: groupName || "Grupo",
                    peers: selected.map((s) => s.id),
                    ai_enabled: false,
                  },
                });
                onCreated(r.room_id);
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally {
              setBusy(false);
            }
          }}
          className="w-full rounded-xl border border-primary/50 bg-primary/15 py-2 text-sm text-primary disabled:opacity-40"
        >
          {selected.length > 1 ? "Crear grupo" : "Abrir chat directo"}
        </button>
      </div>
    </div>
  );
}
