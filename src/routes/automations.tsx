import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSpotify } from "@/hooks/use-spotify";
import { useAutomationsRunner } from "@/hooks/use-automations-runner";
import {
  fetchAutomations,
  createAutomation,
  deleteAutomation,
  updateAutomation,
  type Automation,
  type ActionType,
  type TriggerType,
} from "@/lib/automations";
import { fetchContacts, type WhatsAppContact } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, MapPin, Clock, MessageCircle, Music, Bell, ArrowLeft } from "lucide-react";
import { PickerMap } from "@/components/PickerMap";
import { toast } from "sonner";

export const Route = createFileRoute("/automations")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Automatizaciones — NEVIRA & NOVA" },
      {
        name: "description",
        content:
          "Crea automatizaciones por hora o ubicación: enviar WhatsApp al llegar a casa, poner playlist al amanecer, recordatorios al salir del trabajo.",
      },
      { property: "og:title", content: "Automatizaciones — NEVIRA & NOVA" },
      {
        property: "og:description",
        content: "Reglas inteligentes por hora y geocercas para tu asistente personal.",
      },
      { property: "og:url", content: "https://nova0.lovable.app/automations" },
    ],
    links: [{ rel: "canonical", href: "https://nova0.lovable.app/automations" }],
  }),
  component: AutomationsPage,
});

const DAYS = ["D", "L", "M", "M", "J", "V", "S"];

function AutomationsPage() {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const spotify = useSpotify(true, userId);
  const [items, setItems] = useState<Automation[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void Promise.all([fetchAutomations(userId), fetchContacts(userId)]).then(([a, c]) => {
      setItems(a);
      setContacts(c);
      setLoading(false);
    });
  }, [userId]);

  useAutomationsRunner({
    automations: items.filter((a) => a.enabled),
    onSpotifyPlay: async (q) => {
      try {
        await spotify.playSearch(q);
      } catch (e) {
        console.warn(e);
      }
    },
  });

  const refresh = async () => {
    if (!userId) return;
    setItems(await fetchAutomations(userId));
  };

  const onToggle = async (a: Automation, enabled: boolean) => {
    await updateAutomation(a.id, { enabled });
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled } : x)));
  };

  const onDelete = async (id: string) => {
    await deleteAutomation(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Automatización eliminada");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          aria-label="Volver al inicio"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="text-2xl font-bold">Automatizaciones</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nueva
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <NewAutomationForm
              userId={userId}
              contacts={contacts}
              onCreated={async () => {
                setOpen(false);
                await refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Las automatizaciones se ejecutan mientras la app esté abierta. Geolocalización y reloj se
        evalúan cada 15s.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Aún no tienes automatizaciones.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ej: "Cuando llegue a casa, mandar WhatsApp a mamá" o "Cada lunes 7:00, poner playlist
              de gym".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <TriggerIcon type={a.trigger_type} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {describeTrigger(a)} → {describeAction(a)}
                  </div>
                </div>
                <Switch checked={a.enabled} onCheckedChange={(v) => onToggle(a, v)} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar automatización"
                  onClick={() => onDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function TriggerIcon({ type }: { type: TriggerType }) {
  if (type === "time") return <Clock className="h-5 w-5 text-primary" />;
  return <MapPin className="h-5 w-5 text-primary" />;
}

function describeTrigger(a: Automation): string {
  if (a.trigger_type === "time") {
    const c = a.trigger_config as any;
    const days = (c.days as number[])?.length
      ? (c.days as number[]).map((d) => DAYS[d]).join("")
      : "todos los días";
    return `${c.time} (${days})`;
  }
  const c = a.trigger_config as any;
  const verb = a.trigger_type === "geofence_enter" ? "Llegar a" : "Salir de";
  return `${verb} ${c.label}`;
}

function describeAction(a: Automation): string {
  const c = a.action_config as any;
  if (a.action_type === "whatsapp") return `WhatsApp a ${c.contactName ?? c.to}`;
  if (a.action_type === "spotify") return `Reproducir "${c.query}"`;
  return c.text;
}

function NewAutomationForm({
  userId,
  contacts,
  onCreated,
}: {
  userId: string | null;
  contacts: WhatsAppContact[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("geofence_enter");
  // Geo
  const [placeLabel, setPlaceLabel] = useState("Casa");
  const [coords, setCoords] = useState({ lat: 19.4326, lng: -99.1332 });
  const [radiusM, setRadiusM] = useState(150);
  // Time
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  // Action
  const [actionType, setActionType] = useState<ActionType>("whatsapp");
  const [contactId, setContactId] = useState<string>("");
  const [whatsMessage, setWhatsMessage] = useState("Llegué a casa 🏠");
  const [spotifyQuery, setSpotifyQuery] = useState("playlist gym");
  const [notifText, setNotifText] = useState("Recordatorio");
  const [saving, setSaving] = useState(false);

  // Pedir ubicación actual al abrir si es geofence
  useEffect(() => {
    if (triggerType === "time" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
    );
  }, [triggerType]);

  const submit = async () => {
    if (!userId) return;
    if (!name.trim()) {
      toast.error("Pon un nombre");
      return;
    }

    let trigger_config: any;
    if (triggerType === "time") {
      trigger_config = { time, days };
    } else {
      trigger_config = { label: placeLabel, lat: coords.lat, lng: coords.lng, radiusM };
    }

    let action_config: any;
    if (actionType === "whatsapp") {
      const c = contacts.find((x) => x.id === contactId);
      if (!c) {
        toast.error("Selecciona un contacto");
        return;
      }
      action_config = { to: c.phone, contactName: c.name, message: whatsMessage };
    } else if (actionType === "spotify") {
      action_config = { query: spotifyQuery };
    } else {
      action_config = { text: notifText };
    }

    setSaving(true);
    try {
      await createAutomation(userId, {
        name: name.trim(),
        enabled: true,
        trigger_type: triggerType,
        trigger_config,
        action_type: actionType,
        action_config,
      } as any);
      toast.success("Automatización creada");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nueva automatización</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Nombre</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Llegar a casa"
          />
        </div>

        <div>
          <Label>Cuándo</Label>
          <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geofence_enter">Cuando llegue a un lugar</SelectItem>
              <SelectItem value="geofence_exit">Cuando salga de un lugar</SelectItem>
              <SelectItem value="time">A una hora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {triggerType === "time" ? (
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Label>Días</Label>
            <div className="flex gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setDays((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                    )
                  }
                  className={`h-8 w-8 rounded-full text-xs font-semibold ${days.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Etiqueta del lugar</Label>
            <Input
              value={placeLabel}
              onChange={(e) => setPlaceLabel(e.target.value)}
              placeholder="Casa, Escuela, Trabajo…"
            />
            <PickerMap
              lat={coords.lat}
              lng={coords.lng}
              radiusM={radiusM}
              onPick={(lat, lng) => setCoords({ lat, lng })}
            />
            <Label>Radio: {radiusM} m</Label>
            <input
              type="range"
              aria-label="Radio de geocerca en metros"
              min={50}
              max={1000}
              step={10}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Toca el mapa o arrastra el pin para mover el punto.
            </p>
          </div>
        )}

        <div>
          <Label>Acción</Label>
          <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">Enviar WhatsApp</SelectItem>
              <SelectItem value="spotify">Reproducir música</SelectItem>
              <SelectItem value="notification">Mostrar notificación</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {actionType === "whatsapp" && (
          <div className="space-y-2">
            <Label>Contacto</Label>
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Agrega contactos en Ajustes → WhatsApp.
              </p>
            ) : (
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un contacto" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Label>Mensaje</Label>
            <Input value={whatsMessage} onChange={(e) => setWhatsMessage(e.target.value)} />
          </div>
        )}
        {actionType === "spotify" && (
          <div>
            <Label>Qué reproducir</Label>
            <Input
              value={spotifyQuery}
              onChange={(e) => setSpotifyQuery(e.target.value)}
              placeholder="playlist gym, artista Bad Bunny, canción Tití…"
            />
          </div>
        )}
        {actionType === "notification" && (
          <div>
            <Label>Texto</Label>
            <Input value={notifText} onChange={(e) => setNotifText(e.target.value)} />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </>
  );
}

// Iconos auxiliares no usados pero mantenidos para tree-shaking referencias
void [MessageCircle, Music, Bell];
