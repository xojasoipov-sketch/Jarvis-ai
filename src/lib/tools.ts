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

const ROOT = (process.env.GITHUB_VAULT_PATH || "vault").replace(/^\/|\/$/g, "");

export const BUILTIN_TOOLS: ToolDef[] = [
  {
    name: "list_connections",
    description:
      "BARCHA ulanishlar: Supabase, Telegram, GitHub, Obsidian vault, Hermes, LLM, MCP, internet. 'Nima ulangan?' uchun SHU tool.",
    parameters: { type: "object", properties: {} },
    run: async () => connectionsSummaryJson(),
  },
  {
    name: "get_business_overview",
    description:
      "Biznes holati: vazifalar, loyihalar, bilim bazasi, agent runlar (Supabase).",
    parameters: { type: "object", properties: {} },
    run: async () => {
      if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
      const [tasks, projects, knowledge, runs] = await Promise.all([
        supabase.from("pari_tasks").select("id, title, status, priority").limit(20),
        supabase.from("pari_projects").select("id, name, status").limit(20),
        supabase.from("pari_knowledge").select("id, title").limit(10),
        supabase.from("pari_agent_runs").select("id, agent_name, task, status").order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        tasks: { count: tasks.data?.length ?? 0, items: tasks.data || [], error: tasks.error?.message },
        projects: { count: projects.data?.length ?? 0, items: projects.data || [], error: projects.error?.message },
        knowledge: { count: knowledge.data?.length ?? 0, titles: (knowledge.data || []).map((k) => k.title), error: knowledge.error?.message },
        recent_agent_runs: runs.data || [],
        note: tasks.error?.message?.includes("does not exist")
          ? "Jadvallar yo'q — SQL migratsiyani ishga tushiring"
          : "OK",
      };
    },
  },
  {
    name: "create_file",
    description: "Fayl yaratish (Obsidian vault / GitHub). path masalan: notes/plan.md",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault/GitHub sozlanmagan — GITHUB_TOKEN kerak");
      let path = String(args.path || "").replace(/^\/+/, "");
      if (!path.startsWith(ROOT + "/") && !path.startsWith(ROOT)) {
        path = `${ROOT}/${path}`;
      }
      const ok = await writeVaultFile(path, String(args.content || ""), `pari-ai: create ${path}`);
      if (!ok) throw new Error("Fayl yozilmadi");
      return { ok: true, path };
    },
  },
  {
    name: "read_file",
    description: "Fayl o'qish (Obsidian vault / GitHub)",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault/GitHub sozlanmagan — GITHUB_TOKEN kerak");
      let path = String(args.path || "").replace(/^\/+/, "");
      if (!path.startsWith(ROOT + "/") && !path.startsWith(ROOT)) {
        path = `${ROOT}/${path}`;
      }
      const content = await readVaultFile(path);
      if (content === null) throw new Error(`Fayl topilmadi: ${path}`);
      return { path, content: content.slice(0, 15000) };
    },
  },
  {
    name: "web_search",
    description: "Internet qidiruv",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    run: async (args) => internetSearch(String(args.query || "")),
  },
  {
    name: "web_fetch",
    description: "URL dan matn",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => fetchUrl(String(args.url || "")),
  },
  {
    name: "extract_emails",
    description: "Sahifadan email",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "emails"),
  },
  {
    name: "extract_social_links",
    description: "Sahifadan social linklar",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "social"),
  },
  {
    name: "extract_images",
    description: "Sahifadan rasmlar",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "images"),
  },
  {
    name: "extract_page_text",
    description: "Sahifa matni",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "text"),
  },
  {
    name: "extract_list",
    description: "Sahifadan ro'yxat",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "list"),
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
    description: "Knowledge Hub ga saqlash",
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
    description: "Kodga PR (GitHub)",
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
      return proposeCodeChange(
        String(args.description || ""),
        (args.files || []) as { path: string; content: string }[]
      );
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
    description: "Railway deploy holati",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      platform: "Railway",
      domain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
      env: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV,
    }),
  },
  {
    name: "datetime",
    description: "Joriy sana/vaqt",
    parameters: { type: "object", properties: {} },
    run: async () => ({ iso: new Date().toISOString(), readable: new Date().toString() }),
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
