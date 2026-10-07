import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, KeyRound, Loader2, Mail, User, AtSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function fetchProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Sin sesión activa");
  const user = userData.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  let avatarSigned: string | null = null;
  if (profile?.avatar_url) {
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 60 * 60);
    avatarSigned = signed?.signedUrl ?? null;
  }
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? "",
    username: profile?.username ?? "",
    avatarPath: profile?.avatar_url ?? null,
    avatarSigned,
  };
}

type Profile = Awaited<ReturnType<typeof fetchProfile>>;

export function ProfileHub() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["profile-hub"], queryFn: fetchProfile });

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (data) {
      setDisplayName(data.displayName);
      setUsername(data.username);
      setEmail(data.email);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Sin datos");
      let avatarPath = data.avatarPath;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "png";
        avatarPath = `${data.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          avatar_url: avatarPath,
        })
        .eq("id", data.id);
      if (profErr) throw profErr;

      if (email.trim() && email.trim() !== data.email) {
        const { error: mailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (mailErr) throw mailErr;
      }

      if (password) {
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
        if (password !== password2) throw new Error("Las contraseñas no coinciden");
        const { error: passErr } = await supabase.auth.updateUser({ password });
        if (passErr) throw passErr;
      }
    },
    onSuccess: () => {
      toast.success("Perfil guardado");
      setPassword("");
      setPassword2("");
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ["profile-hub"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Inicia sesión para editar tu perfil.</p>;
  }

  const shownAvatar = avatarPreview ?? data.avatarSigned;
  const emailChanged = email.trim() !== data.email;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-28 w-28 overflow-hidden rounded-full border-2 border-primary/40 bg-muted"
        >
          {shownAvatar ? (
            <img src={shownAvatar} alt="Tu foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-primary">
              {(displayName || email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>
        <p className="text-xs text-muted-foreground">Toca la foto para cambiarla (máx. 5 MB)</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) {
              toast.error("La imagen supera 5 MB");
              return;
            }
            setAvatarFile(f);
            setAvatarPreview(URL.createObjectURL(f));
          }}
        />
      </div>

      {/* Datos */}
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Nombre
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AtSign className="h-3.5 w-3.5" /> Usuario
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
            placeholder="tu_usuario"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Correo
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {emailChanged && (
            <span className="mt-1 block text-[11px] text-amber-500">
              Te enviaremos un correo de confirmación a la nueva dirección.
            </span>
          )}
        </label>
      </div>

      {/* Contraseña */}
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" /> Cambiar contraseña (opcional)
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Repite la nueva contraseña"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Guardar cambios
      </button>
    </div>
  );
}
