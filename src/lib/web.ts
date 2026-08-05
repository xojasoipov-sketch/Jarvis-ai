/**
 * Internet access for AI Brain — multi-backend, Railway-safe.
 */

const UA =
  "Mozilla/5.0 (compatible; PariAI/1.0; +https://github.com/xojasoipov-sketch/Jarvis-ai)";

export async function fetchUrl(url: string, timeoutMs = 15000): Promise<{
  url: string;
  status: number;
  title: string;
  text: string;
  html_length: number;
}> {
  if (!/^https?:\/\//i.test(url)) throw new Error("URL https:// bilan boshlanishi kerak");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/json,*/*" },
    redirect: "follow",
  });
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (ct.includes("application/json")) {
    return {
      url: res.url || url,
      status: res.status,
      title: "json",
      text: raw.slice(0, 8000),
      html_length: raw.length,
    };
  }
  const titleM = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
  const text = stripHtml(raw).slice(0, 8000);
  return {
    url: res.url || url,
    status: res.status,
    title: titleM?.[1]?.trim() || "",
    text,
    html_length: raw.length,
  };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type SearchHit = { title: string; url: string; snippet: string; source: string };

async function searchDdgInstant(query: string): Promise<SearchHit[]> {
  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    { signal: AbortSignal.timeout(8000), headers: { "User-Agent": UA } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const hits: SearchHit[] = [];
  if (data.AbstractText) {
    hits.push({
      title: data.Heading || query,
      url: data.AbstractURL || data.AbstractSource || "",
      snippet: data.AbstractText,
      source: "ddg-instant",
    });
  }
  for (const t of data.RelatedTopics || []) {
    if (t.Text) {
      hits.push({
        title: (t.Text as string).slice(0, 80),
        url: t.FirstURL || "",
        snippet: t.Text,
        source: "ddg-instant",
      });
    }
    for (const t2 of t.Topics || []) {
      if (t2.Text) {
        hits.push({
          title: (t2.Text as string).slice(0, 80),
          url: t2.FirstURL || "",
          snippet: t2.Text,
          source: "ddg-instant",
        });
      }
    }
  }
  return hits.slice(0, 8);
}

async function searchDdgHtml(query: string): Promise<SearchHit[]> {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const hits: SearchHit[] = [];
  const blocks = html.split(/class="result__a"/i).slice(1);
  for (const b of blocks.slice(0, 8)) {
    const hrefM = b.match(/href="([^"]+)"/i);
    const titleM = b.match(/>([^<]+)<\/a>/i);
    const snipM =
      b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
      b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\//i);
    let url = hrefM?.[1] || "";
    if (url.includes("uddg=")) {
      try {
        const u = new URL(url, "https://duckduckgo.com");
        url = decodeURIComponent(u.searchParams.get("uddg") || url);
      } catch {}
    }
    const title = stripHtml(titleM?.[1] || "").slice(0, 120);
    const snippet = stripHtml(snipM?.[1] || "").slice(0, 300);
    if (title || url) hits.push({ title: title || url, url, snippet, source: "ddg-html" });
  }
  return hits;
}

async function searchWikipedia(query: string): Promise<SearchHit[]> {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`,
    { signal: AbortSignal.timeout(8000), headers: { "User-Agent": UA } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const titles: string[] = data[1] || [];
  const descs: string[] = data[2] || [];
  const urls: string[] = data[3] || [];
  return titles.map((title, i) => ({
    title,
    url: urls[i] || "",
    snippet: descs[i] || "",
    source: "wikipedia",
  }));
}

async function searchBrave(query: string): Promise<SearchHit[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
    {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "X-Subscription-Token": key, "User-Agent": UA },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.web?.results || []).slice(0, 8).map((r: { title?: string; url?: string; description?: string }) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.description || "",
    source: "brave",
  }));
}

export async function internetSearch(query: string): Promise<{ query: string; hits: SearchHit[]; backends: string[] }> {
  const backends: string[] = [];
  const all: SearchHit[] = [];
  const parts = await Promise.allSettled([
    searchBrave(query),
    searchDdgInstant(query),
    searchDdgHtml(query),
    searchWikipedia(query),
  ]);
  const names = ["brave", "ddg-instant", "ddg-html", "wikipedia"];
  parts.forEach((p, i) => {
    if (p.status === "fulfilled" && p.value.length) {
      backends.push(names[i]);
      all.push(...p.value);
    }
  });
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const h of all) {
    const key = h.url || h.title;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(h);
    if (hits.length >= 10) break;
  }
  return { query, hits, backends };
}

export async function extractFromPage(
  url: string,
  mode: "text" | "emails" | "social" | "images" | "list"
) {
  const page = await fetchUrl(url);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  const html = await res.text();

  if (mode === "text") {
    return { url: page.url, title: page.title, text: page.text, chars: page.text.length };
  }
  if (mode === "emails") {
    const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set((html.match(re) || []).map((e) => e.toLowerCase()))]
      .filter((e) => !/\.(png|jpg|gif|svg)$/i.test(e))
      .slice(0, 50);
    return { url, count: emails.length, emails };
  }
  if (mode === "social") {
    const platforms: Record<string, string[]> = {
      telegram: [],
      instagram: [],
      twitter: [],
      linkedin: [],
      youtube: [],
      facebook: [],
      tiktok: [],
    };
    const patterns: [string, RegExp][] = [
      ["telegram", /https?:\/\/(?:t\.me|telegram\.me)\/[^\s"'<>]+/gi],
      ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/gi],
      ["twitter", /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/gi],
      ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/gi],
      ["youtube", /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>]+/gi],
      ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi],
      ["tiktok", /https?:\/\/(?:www\.)?tiktok\.com\/[^\s"'<>]+/gi],
    ];
    for (const [name, re] of patterns) {
      platforms[name] = [...new Set(html.match(re) || [])].slice(0, 15);
    }
    return { url, platforms, total: Object.values(platforms).reduce((a, b) => a + b.length, 0) };
  }
  if (mode === "images") {
    const base = new URL(url);
    const set = new Set<string>();
    for (const m of html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi)) {
      try {
        set.add(new URL(m[1], base).href);
      } catch {}
    }
    return { url, count: set.size, images: [...set].slice(0, 40) };
  }
  const items: string[] = [];
  for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const t = stripHtml(m[1]).slice(0, 300);
    if (t.length > 2) items.push(t);
    if (items.length >= 50) break;
  }
  return { url, count: items.length, items };
}
