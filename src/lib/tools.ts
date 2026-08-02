import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, proposeCodeChange, mergePullRequest } from "@/lib/githubRepo";
import { supabase, dbConfigured } from "@/lib/supabase";

export type ToolDef = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

/** HTML dan toza matn */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
  if (!/^https?:\/\//.test(url)) throw new Error("To'g'ri URL kiriting (https://...)");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PariAI/1.0; +https://github.com/xojasoipov-sketch/Jarvis-ai)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export const BUILTIN_TOOLS: ToolDef[] = [
  {
    name: "calculator",
    description: "Matematik ifodani hisoblaydi",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "Masalan: (12+8)*3" } },
      required: ["expression"],
    },
    run: async (args) => {
      const expr = String(args.expression || "");
      if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error("Faqat sonlar va +-*/()% belgilariga ruxsat");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      return { expression: expr, result };
    },
  },
  {
    name: "datetime",
    description: "Joriy sana va vaqtni qaytaradi",
    parameters: { type: "object", properties: {} },
    run: async () => ({ iso: new Date().toISOString(), readable: new Date().toString() }),
  },
  {
    name: "web_fetch",
    description: "Berilgan URL'dan matn tarkibini oladi",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => {
      const url = String(args.url || "");
      const html = await fetchHtml(url);
      return { url, content: stripHtml(html).slice(0, 5000) };
    },
  },
  {
    name: "web_search",
    description: "Internetdan qidiruv qiladi (DuckDuckGo Instant Answer)",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: async (args) => {
      const query = String(args.query || "");
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const results: string[] = [];
      if (data.AbstractText) results.push(`${data.Heading}: ${data.AbstractText}`);
      for (const t of (data.RelatedTopics || []).slice(0, 5)) {
        if (t.Text) results.push(t.Text);
      }
      return { query, results };
    },
  },

  // ── Ultimate Web Scraper ilhomidagi extractorlar ──────────────────────────
  {
    name: "extract_emails",
    description:
      "Sahifadan email manzillarini topadi (Ultimate Web Scraper / Email Extractor uslubida). Lead generation uchun.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Sahifa URL" },
        max: { type: "number", description: "Maksimal email soni (default 50)" },
      },
      required: ["url"],
    },
    run: async (args) => {
      const url = String(args.url || "");
      const max = Math.min(Number(args.max) || 50, 200);
      const html = await fetchHtml(url);
      const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = [...new Set((html.match(re) || []).map((e) => e.toLowerCase()))]
        .filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif") && !e.includes("example.com"))
        .slice(0, max);
      return { url, count: found.length, emails: found };
    },
  },
  {
    name: "extract_social_links",
    description:
      "Sahifadan ijtimoiy tarmoq linklarini topadi (Telegram, Instagram, Twitter/X, LinkedIn, YouTube, Facebook, TikTok).",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
    run: async (args) => {
      const url = String(args.url || "");
      const html = await fetchHtml(url);
      const platforms: Record<string, string[]> = {
        telegram: [],
        instagram: [],
        twitter: [],
        linkedin: [],
        youtube: [],
        facebook: [],
        tiktok: [],
      };
      const patterns: [keyof typeof platforms, RegExp][] = [
        ["telegram", /href=["'](https?:\/\/(?:t\.me|telegram\.me)\/[^"'\s]+)["']/gi],
        ["instagram", /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi],
        ["twitter", /href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s]+)["']/gi],
        ["linkedin", /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s]+)["']/gi],
        ["youtube", /href=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'\s]+)["']/gi],
        ["facebook", /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/gi],
        ["tiktok", /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s]+)["']/gi],
      ];
      for (const [name, re] of patterns) {
        const set = new Set<string>();
        for (const m of html.matchAll(re)) set.add(m[1].replace(/&amp;/g, "&"));
        platforms[name] = [...set].slice(0, 20);
      }
      const total = Object.values(platforms).reduce((a, b) => a + b.length, 0);
      return { url, total, platforms };
    },
  },
  {
    name: "extract_images",
    description: "Sahifadan rasm URL larini oladi (Image Downloader uslubida).",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        max: { type: "number", description: "Default 30" },
      },
      required: ["url"],
    },
    run: async (args) => {
      const pageUrl = String(args.url || "");
      const max = Math.min(Number(args.max) || 30, 100);
      const html = await fetchHtml(pageUrl);
      const base = new URL(pageUrl);
      const set = new Set<string>();
      for (const m of html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg)[^"']*)["']/gi)) {
        try {
          set.add(new URL(m[1], base).href);
        } catch {}
      }
      for (const m of html.matchAll(/url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|gif))["']?\)/gi)) {
        try {
          set.add(new URL(m[1], base).href);
        } catch {}
      }
      const images = [...set].slice(0, max);
      return { url: pageUrl, count: images.length, images };
    },
  },
  {
    name: "extract_page_text",
    description:
      "Sahifadan toza matn + title + meta description oladi (Page Text Extractor). Knowledge Hub ga saqlash uchun qulay.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        max_chars: { type: "number", description: "Default 8000" },
      },
      required: ["url"],
    },
    run: async (args) => {
      const url = String(args.url || "");
      const maxChars = Math.min(Number(args.max_chars) || 8000, 20000);
      const html = await fetchHtml(url);
      const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descM =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const text = stripHtml(html).slice(0, maxChars);
      return {
        url,
        title: titleM?.[1]?.trim() || "",
        description: descM?.[1]?.trim() || "",
        text,
        chars: text.length,
      };
    },
  },
  {
    name: "extract_list",
    description:
      "Sahifadan ro'yxat elementlarini oladi (List Extractor): <li>, jadval qatorlari yoki takrorlanuvchi bloklar.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        max: { type: "number", description: "Default 50" },
      },
      required: ["url"],
    },
    run: async (args) => {
      const url = String(args.url || "");
      const max = Math.min(Number(args.max) || 50, 200);
      const html = await fetchHtml(url);
      const items: string[] = [];
      for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        const t = stripHtml(m[1]).slice(0, 300);
        if (t.length > 2) items.push(t);
        if (items.length >= max) break;
      }
      if (items.length < 5) {
        for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
          const t = stripHtml(m[1]).slice(0, 300);
          if (t.length > 2) items.push(t);
          if (items.length >= max) break;
        }
      }
      return { url, count: items.length, items: items.slice(0, max) };
    },
  },

  {
    name: "web_crawl",
    description: "Berilgan URL'ning ichki linklari orqali kontent yig'adi (max 5 sahifa)",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        max_pages: { type: "number", description: "Default 3, max 5" },
      },
      required: ["url"],
    },
    run: async (args) => {
      const startUrl = String(args.url || "");
      if (!/^https?:\/\//.test(startUrl)) throw new Error("To'g'ri URL kiriting");
      const maxPages = Math.min(Number(args.max_pages) || 3, 5);
      const visited = new Set<string>();
      const results: { url: string; title: string; excerpt: string }[] = [];

      async function crawl(url: string) {
        if (visited.has(url) || visited.size >= maxPages) return;
        visited.add(url);
        try {
          const html = await fetchHtml(url, 6000);
          const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleM?.[1]?.trim() || url;
          const text = stripHtml(html).slice(0, 500);
          results.push({ url, title, excerpt: text });
          const base = new URL(url);
          const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
            .map((m) => {
              try {
                return new URL(m[1], url).href;
              } catch {
                return "";
              }
            })
            .filter((h) => h.startsWith(base.origin) && !visited.has(h))
            .slice(0, 5);
          for (const link of links) await crawl(link);
        } catch {}
      }

      await crawl(startUrl);
      return { pages_visited: results.length, results };
    },
  },

  {
    name: "vault_read",
    description: "Obsidian vault'dan faylni o'qiydi",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { path: args.path, content: await readVaultFile(String(args.path || "")) };
    },
  },
  {
    name: "vault_write",
    description: "Obsidian vault'ga fayl yozadi",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      await writeVaultFile(String(args.path || ""), String(args.content || ""));
      return { ok: true, path: args.path };
    },
  },
  {
    name: "vault_search",
    description: "Obsidian vault ichida qidiradi",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { results: await searchVault(String(args.query || "")) };
    },
  },
  {
    name: "vault_list",
    description: "Obsidian vault fayllarini ro'yxatlaydi",
    parameters: { type: "object", properties: { path: { type: "string" } } },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { files: await listVault(String(args.path || "")) };
    },
  },
  {
    name: "knowledge_search",
    description:
      "Knowledge Hub'dan qidiradi (Supabase). Katta corpus uchun kelajakda turbovec (TurboQuant) vector index ulanishi mumkin — hozir ilike + tags.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const q = String(args.query || "");
      const { data, error } = await supabase!
        .from("pari_knowledge")
        .select("id, title, content, tags, created_at")
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(5);
      if (error) throw new Error(error.message);
      return {
        query: q,
        results: (data || []).map((r) => ({
          title: r.title,
          content: r.content.slice(0, 400),
          tags: r.tags,
        })),
      };
    },
  },
  {
    name: "knowledge_save",
    description: "Bilim / eslatmani Knowledge Hub'ga saqlaydi",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content"],
    },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const { data, error } = await supabase!
        .from("pari_knowledge")
        .insert({
          title: String(args.title),
          content: String(args.content),
          tags: (args.tags as string[]) || [],
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: data?.id };
    },
  },
  {
    name: "create_task",
    description: "Yangi vazifa yaratadi",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["title"],
    },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const { data, error } = await supabase!
        .from("pari_tasks")
        .insert({
          title: String(args.title),
          description: String(args.description || ""),
          priority: String(args.priority || "medium"),
        })
        .select("id, title")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, task: data };
    },
  },
  {
    name: "propose_code_change",
    description: "O'z kodiga PR orqali o'zgartirish taklif qiladi",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string" },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: { path: { type: "string" }, content: { type: "string" } },
            required: ["path", "content"],
          },
        },
      },
      required: ["description", "files"],
    },
    run: async (args) => {
      if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
      const description = String(args.description || "");
      const files = (args.files || []) as { path: string; content: string }[];
      const { prUrl, branch } = await proposeCodeChange(description, files);
      return { ok: true, prUrl, branch };
    },
  },
  {
    name: "merge_pull_request",
    description: "GitHub PR ni merge qiladi",
    parameters: {
      type: "object",
      properties: { pr_number: { type: "number" } },
      required: ["pr_number"],
    },
    run: async (args) => {
      if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
      return { ok: true, ...(await mergePullRequest(Number(args.pr_number))) };
    },
  },
  {
    name: "railway_info",
    description:
      "Deploy platformasi haqida ma'lumot. App Railway da ishlaydi; redeploy GitHub push yoki Railway dashboard orqali.",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      platform: "Railway",
      public_domain: process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || null,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || "unknown",
      note: "Redeploy: git push main yoki Railway → Deployments → Redeploy. Vercel ishlatilmaydi.",
    }),
  },
];

export function toolsAsOpenAIFunctions() {
  return BUILTIN_TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = BUILTIN_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Noma'lum vosita: ${name}`);
  return tool.run(args);
}
