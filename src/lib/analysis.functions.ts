import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";

export type WebResult = { title: string; url: string; snippet: string };
export type RedditResult = {
  title: string;
  subreddit: string;
  url: string;
  ups: number;
  snippet: string;
  created: string;
};
export type XResult = { text: string; author: string; url: string; created_at?: string };

async function searchWeb(query: string, limit = 6): Promise<WebResult[]> {
  try {
    const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 NovaBot/1.0" },
    });
    const html = await res.text();
    const out: WebResult[] = [];
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const clean = (s: string) =>
      s
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < limit) {
      let url = m[1];
      const dd = url.match(/uddg=([^&]+)/);
      if (dd) url = decodeURIComponent(dd[1]);
      out.push({ url, title: clean(m[2]), snippet: clean(m[3]).slice(0, 260) });
    }
    return out;
  } catch {
    return [];
  }
}

async function searchReddit(query: string, limit = 8): Promise<RedditResult[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`,
      { headers: { "User-Agent": "NovaBot/1.0" } },
    );
    if (!res.ok) return [];
    const j = (await res.json()) as {
      data?: {
        children?: Array<{
          data: {
            title?: string;
            subreddit?: string;
            permalink?: string;
            ups?: number;
            selftext?: string;
            created_utc?: number;
          };
        }>;
      };
    };
    return (j.data?.children ?? []).map((c) => ({
      title: c.data.title ?? "",
      subreddit: c.data.subreddit ?? "",
      url: c.data.permalink ? `https://reddit.com${c.data.permalink}` : "",
      ups: c.data.ups ?? 0,
      snippet: (c.data.selftext ?? "").slice(0, 220),
      created: c.data.created_utc
        ? new Date(c.data.created_utc * 1000).toISOString()
        : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function searchX(query: string): Promise<{ posts: XResult[]; error?: string }> {
  const lovKey = process.env.LOVABLE_API_KEY;
  const xKey = process.env.X_API_KEY;
  if (!lovKey || !xKey)
    return { posts: [], error: "X no conectado — se analizan solo Web y Reddit." };
  try {
    const url = `https://connector-gateway.lovable.dev/x/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=15&tweet.fields=created_at,public_metrics&expansions=author_id&user.fields=username,name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${lovKey}`, "X-Connection-Api-Key": xKey },
    });
    if (!res.ok) return { posts: [], error: `X ${res.status}` };
    const j = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; author_id?: string }>;
      includes?: { users?: Array<{ id: string; username: string }> };
    };
    const users = new Map((j.includes?.users ?? []).map((u) => [u.id, u]));
    return {
      posts: (j.data ?? []).map((t) => {
        const u = t.author_id ? users.get(t.author_id) : undefined;
        return {
          text: t.text,
          author: u ? `@${u.username}` : "",
          url: u ? `https://x.com/${u.username}/status/${t.id}` : "",
          created_at: t.created_at,
        };
      }),
    };
  } catch (e) {
    return { posts: [], error: e instanceof Error ? e.message : "error" };
  }
}

export const runTopicAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(160),
        focus: z.enum(["trend", "person", "brand", "event"]).default("trend"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const [web, reddit, x] = await Promise.all([
      searchWeb(data.topic),
      searchReddit(data.topic),
      searchX(data.topic),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    let report = "";
    let sentiment = 50;
    if (apiKey) {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const corpus = [
        "WEB:",
        ...web.map((w) => `- ${w.title} — ${w.snippet} (${w.url})`),
        "REDDIT:",
        ...reddit.map((r) => `- r/${r.subreddit}: ${r.title} (${r.ups}↑) ${r.snippet}`),
        "X:",
        ...x.posts.map((p) => `- ${p.author}: ${p.text}`),
      ].join("\n");
      const res = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system:
          "Eres Oráculo, analista de tendencias. Solo información pública. Estructura en markdown: **Resumen**, **Señales clave**, **Sentimiento** y **Qué vigilar**. Máximo 220 palabras. Termina SIEMPRE con una última línea exactamente así: SENTIMENT=<0-100> (0 muy negativo, 100 muy positivo).",
        prompt: `Tema: ${data.topic}\nEnfoque: ${data.focus}\n\nFuentes:\n${corpus.slice(0, 12000)}`,
      });
      report = res.text;
      const m = report.match(/SENTIMENT=(\d{1,3})/);
      if (m) {
        sentiment = Math.max(0, Math.min(100, Number(m[1])));
        report = report.replace(/SENTIMENT=\d{1,3}\s*$/, "").trim();
      }
    }

    // menciones por día (reddit como proxy temporal)
    const byDay = new Map<string, number>();
    for (const r of reddit) {
      const d = r.created.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    for (const p of x.posts) {
      if (!p.created_at) continue;
      const d = p.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const timeline = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, count]) => ({ day, count }));

    return {
      topic: data.topic,
      focus: data.focus,
      report,
      sentiment,
      timeline,
      web,
      reddit,
      x: x.posts,
      xError: x.error ?? null,
    };
  });
