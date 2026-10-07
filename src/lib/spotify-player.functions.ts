import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlayerState = {
  status: "ok" | "not_connected" | "no_device" | "premium_required" | "error";
  message?: string;
  isPlaying?: boolean;
  trackId?: string;
  title?: string;
  artist?: string;
  cover?: string;
  durationMs?: number;
  progressMs?: number;
  shuffle?: boolean;
  repeat?: "off" | "track" | "context";
  volume?: number | null;
  device?: string;
  liked?: boolean;
};

export type TrackHit = { uri: string; id: string; title: string; artist: string; cover?: string };

type SpTrack = { id: string; uri: string; name: string; duration_ms: number; artists: { name: string }[]; album: { images: { url: string }[] } };

function asState(e: unknown): PlayerState {
  const code = (e as { code?: string })?.code;
  const message = e instanceof Error ? e.message : "Error";
  if (code === "not_connected" || code === "no_device" || code === "premium_required") return { status: code, message };
  return { status: "error", message };
}

export const getPlayerState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlayerState> => {
    const { getUserToken, spotifyApi } = await import("./spotify-player.server");
    try {
      const token = await getUserToken(context.supabase, context.userId);
      const p = await spotifyApi<{
        is_playing: boolean;
        progress_ms: number;
        shuffle_state: boolean;
        repeat_state: "off" | "track" | "context";
        device: { name: string; volume_percent: number | null };
        item: SpTrack | null;
      }>(token, "/me/player");
      if (!p) return { status: "no_device", message: "No hay un dispositivo activo. Abre Spotify y pon algo a sonar." };
      let liked = false;
      if (p.item) {
        const l = await spotifyApi<boolean[]>(token, `/me/tracks/contains?ids=${p.item.id}`).catch(() => null);
        liked = !!l?.[0];
      }
      return {
        status: "ok",
        isPlaying: p.is_playing,
        trackId: p.item?.id,
        title: p.item?.name,
        artist: p.item?.artists.map((a) => a.name).join(", "),
        cover: p.item?.album.images[0]?.url,
        durationMs: p.item?.duration_ms ?? 0,
        progressMs: p.progress_ms ?? 0,
        shuffle: p.shuffle_state,
        repeat: p.repeat_state,
        volume: p.device?.volume_percent,
        device: p.device?.name,
        liked,
      };
    } catch (e) {
      return asState(e);
    }
  });

const ControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("play") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("previous") }),
  z.object({ action: z.literal("seek"), positionMs: z.number().int().min(0) }),
  z.object({ action: z.literal("volume"), percent: z.number().int().min(0).max(100) }),
  z.object({ action: z.literal("shuffle"), state: z.boolean() }),
  z.object({ action: z.literal("repeat"), state: z.enum(["off", "track", "context"]) }),
  z.object({ action: z.literal("like"), trackId: z.string().min(1).max(64), liked: z.boolean() }),
  z.object({ action: z.literal("playUris"), uris: z.array(z.string().startsWith("spotify:")).min(1).max(50) }),
  z.object({ action: z.literal("playContext"), contextUri: z.string().startsWith("spotify:") }),
]);

export const controlPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ControlSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { getUserToken, spotifyApi } = await import("./spotify-player.server");
    try {
      const token = await getUserToken(context.supabase, context.userId);
      const put = (path: string, body?: unknown) =>
        spotifyApi(token, path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
      switch (data.action) {
        case "play": await put("/me/player/play"); break;
        case "pause": await put("/me/player/pause"); break;
        case "next": await spotifyApi(token, "/me/player/next", { method: "POST" }); break;
        case "previous": await spotifyApi(token, "/me/player/previous", { method: "POST" }); break;
        case "seek": await put(`/me/player/seek?position_ms=${data.positionMs}`); break;
        case "volume": await put(`/me/player/volume?volume_percent=${data.percent}`); break;
        case "shuffle": await put(`/me/player/shuffle?state=${data.state}`); break;
        case "repeat": await put(`/me/player/repeat?state=${data.state}`); break;
        case "like":
          await spotifyApi(token, `/me/tracks?ids=${encodeURIComponent(data.trackId)}`, { method: data.liked ? "PUT" : "DELETE" });
          break;
        case "playUris": await put("/me/player/play", { uris: data.uris }); break;
        case "playContext": await put("/me/player/play", { context_uri: data.contextUri }); break;
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, ...asState(e) };
    }
  });

export const searchTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    const { getUserToken, spotifyApi } = await import("./spotify-player.server");
    try {
      const token = await getUserToken(context.supabase, context.userId);
      const r = await spotifyApi<{ tracks: { items: SpTrack[] } }>(token, `/search?type=track&limit=10&q=${encodeURIComponent(data.q)}`);
      const hits: TrackHit[] = (r?.tracks.items ?? []).map((t) => ({
        uri: t.uri, id: t.id, title: t.name, artist: t.artists.map((a) => a.name).join(", "), cover: t.album.images.at(-1)?.url,
      }));
      return { ok: true as const, hits };
    } catch (e) {
      return { ok: false as const, hits: [] as TrackHit[], ...asState(e) };
    }
  });

export const listMyPlaylists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserToken, spotifyApi } = await import("./spotify-player.server");
    try {
      const token = await getUserToken(context.supabase, context.userId);
      const r = await spotifyApi<{ items: { uri: string; id: string; name: string; images: { url: string }[] | null }[] }>(token, "/me/playlists?limit=20");
      return {
        ok: true as const,
        playlists: (r?.items ?? []).filter(Boolean).map((p) => ({ uri: p.uri, id: p.id, name: p.name, cover: p.images?.at(-1)?.url })),
      };
    } catch (e) {
      return { ok: false as const, playlists: [] as { uri: string; id: string; name: string; cover?: string }[], ...asState(e) };
    }
  });
