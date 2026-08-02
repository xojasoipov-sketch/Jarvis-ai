import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, proposeCodeChange, mergePullRequest } from "@/lib/githubRepo";
import { supabase, dbConfigured } from "@/lib/supabase";
import { connectionsSummaryJson } from "@/lib/connections";
import { internetSearch, fetchUrl, extractFromPage } from "@/lib/web";

export type ToolDef = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

export const BUILTIN_TOOLS: ToolDef[] = [
  {
    name: "list_connections",
    description: "Ulangan xizmatlar va tool lar holati",
    parameters: { type: "object", properties: {} },
    run: async () => connectionsSummaryJson(),
  },
  {
    name: "calculator",
    description: "Matematik ifoda",
    parameters: {
      type: "object",
      properties: { expression: { type: "string" } },
      required: ["expression"],
    },
    run: async (args) => {
      const expr = String(args.expression || "");
      if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error("Faqat sonlar va +-*/()%");
      // eslint-disable-next-line no-new-func
      return { expression: expr, result: Function(`"use strict"; return (${expr})`)() };
    },
  },
  {
    name: "datetime",
    description: "Joriy sana/vaqt",
    parameters: { type: "object", properties: {} },
    run: async () => ({ iso: new Date().toISOString(), readable: new Date().toString() }),
  },
  {
    name: "web_search",
    description:
      "INTERNET qidiruv — hozirgi voqealar, faktlar, saytlar. Har doim internet kerak bo'lsa shu tool.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Qidiruv so'rovi" } },
      required: ["query"],
    },
    run: async (args) => internetSearch(String(args.query || "")),
  },
  {
    name: "web_fetch",
    description: "URL ochib matn olish (internet)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => fetchUrl(String(args.url || "")),
  },
  {
    name: "extract_emails",
    description: "Sahifadan email lar (Email Extractor)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "emails"),
  },
  {
    name: "extract_social_links",
    description: "Sahifadan social linklar (Social Link Extractor)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "social"),
  },
  {
    name: "extract_images",
    description: "Sahifadan rasmlar (Image Downloader)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "images"),
  },
  {
    name: "extract_page_text",
    description: "Sahifa toza matni (Page Text Extractor)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "text"),
  },
  {
    name: "extract_list",
    description: "Sahifadan ro'yxatlar (List Extractor)",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "list"),
  },
  {
    name: "web_crawl",
    description: "Bir necha sahifa crawl",
    parameters: {
      type: "object",
      properties: { url: { type: "string" }, max_pages: { type: "number" } },
      required: ["url"],
    },
    run: async (args) => {
      const start = String(args.url || "");
      const max = Math.min(Number(args.max_pages) || 3, 5);
      const visited = new Set<string>();
      const results: { url: string; title: string; excerpt: string }[] = [];
      async function crawl(u: string) {
        if (visited.has(u) || visited.size >= max) return;
        visited.add(u);
        try {
          const p = await fetchUrl(u, 8000);
          results.push({ url: p.url, title: p.title, excerpt: p.text.slice(0, 400) });
        } catch {}
      }
      await crawl(start);
      return { pages_visited: results.length, results };
    },
  },
  {
    name: "vault_read",
    description: "Vault fayl o'qish",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      return { path: args.path, content: await readVaultFile(String(args.path || "")) };
    },
  },
  {
    name: "vault_write",
    description: "Vault yozish",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      await writeVaultFile(String(args.path || ""), String(args.content || ""));
      return { ok: true, path: args.path };
    },
  },
  {
    name: "vault_search",
    description: "Vault qidiruv",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      return { results: await searchVault(String(args.query || "")) };
    },
  },
  {
    name: "vault_list",
    description: "Vault ro'yxat",
    parameters: { type: "object", properties: { path: { type: "string" } } },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      return { files: await listVault(String(args.path || "")) };
    },
  },
  {
    name: "knowledge_search",
    description: "Knowledge Hub qidiruv",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const q = String(args.query || "");
      const { data, error } = await supabase!
        .from("pari_knowledge")
        .select("id, title, content, tags")
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(5);
      if (error) throw new Error(error.message);
      return { query: q, results: data || [] };
    },
  },
  {
    name: "knowledge_save",
    description: "Knowledge Hub saqlash",
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
    description: "Vazifa yaratish",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string" },
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
    description: "Kod o'zgarishi PR",
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
      return proposeCodeChange(String(args.description || ""), (args.files || []) as { path: string; content: string }[]);
    },
  },
  {
    name: "merge_pull_request",
    description: "PR merge",
    parameters: {
      type: "object",
      properties: { pr_number: { type: "number" } },
      required: ["pr_number"],
    },
    run: async (args) => {
      if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
      return mergePullRequest(Number(args.pr_number));
    },
  },
  {
    name: "railway_info",
    description: "Railway holati",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      platform: "Railway",
      domain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
      env: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV,
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
