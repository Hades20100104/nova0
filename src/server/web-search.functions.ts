import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

interface SearchInput {
  query: string;
}

interface SearchResult {
  results: Array<{ title: string; url: string; snippet: string }>;
  error: string | null;
}

/**
 * Búsqueda web mínima usando DuckDuckGo Instant Answer + scraping ligero.
 * Devuelve hasta 5 resultados {title,url,snippet}. No requiere API key.
 */
export const webSearch = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: SearchInput): SearchInput => {
    if (typeof input?.query !== "string" || input.query.length < 2 || input.query.length > 200) {
      throw new Error("Query inválida");
    }
    return input;
  })
  .handler(async ({ data }): Promise<SearchResult> => {
    try {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(data.query)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; NovaAgent/1.0; +https://nova0.lovable.app)",
          Accept: "text/html",
        },
      });
      if (!res.ok) {
        return { results: [], error: `Búsqueda falló (${res.status})` };
      }
      const html = await res.text();
      // Parser muy simple para resultados de DuckDuckGo HTML.
      const results: SearchResult["results"] = [];
      const blockRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = blockRe.exec(html)) !== null && results.length < 5) {
        const rawUrl = m[1];
        const cleanUrl = rawUrl.startsWith("//duckduckgo.com/l/?uddg=")
          ? decodeURIComponent(rawUrl.split("uddg=")[1].split("&")[0])
          : rawUrl;
        const stripTags = (s: string) =>
          s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
        results.push({
          title: stripTags(m[2]).slice(0, 200),
          url: cleanUrl.slice(0, 500),
          snippet: stripTags(m[3]).slice(0, 400),
        });
      }
      return { results, error: null };
    } catch (e) {
      console.error("webSearch error", e);
      return { results: [], error: "Error de red" };
    }
  });
