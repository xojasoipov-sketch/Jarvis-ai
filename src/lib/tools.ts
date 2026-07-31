import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, vercelConfigured, proposeCodeChange, mergePullRequest, vercelRedeploy } from "@/lib/githubRepo";

export type ToolDef = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

export const BUILTIN_TOOLS: ToolDef[] = [
  {
    name: "calculator",
    description: "Matematik ifodani hisoblaydi",
    parameters: { type: "object", properties: { expression: { type: "string", description: "Masalan: (12+8)*3" } }, required: ["expression"] },
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
      if (!/^https?:\/\//.test(url)) throw new Error("To'g'ri URL kiriting");
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      return { url, status: res.status, content: text.slice(0, 5000) };
    },
  },
  {
    name: "vault_read",
    description: "Obsidian vault'dan (shaxsiy xotira) faylni o'qiydi",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { path: args.path, content: await readVaultFile(String(args.path || "")) };
    },
  },
  {
    name: "vault_write",
    description: "Obsidian vault'ga (shaxsiy xotira) fayl yozadi yoki eslatma saqlaydi",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      await writeVaultFile(String(args.path || ""), String(args.content || ""));
      return { ok: true, path: args.path };
    },
  },
  {
    name: "vault_search",
    description: "Obsidian vault ichida (shaxsiy xotirada) qidiradi",
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
    name: "propose_code_change",
    description:
      "Pari AI ilovasining o'z manba kodiga o'zgartirish taklif qiladi. Yangi branch yaratadi, fayllarni yozadi va GitHub'da Pull Request ochadi.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "O'zgarish nima uchun va nima qilishini qisqacha tushuntirish" },
        files: {
          type: "array",
          description: "O'zgartiriladigan yoki qo'shiladigan fayllar ro'yxati",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "Repo ichidagi to'liq fayl yo'li, masalan src/app/page.tsx" },
              content: { type: "string", description: "Faylning to'liq yangi tarkibi" },
            },
            required: ["path", "content"],
          },
        },
      },
      required: ["description", "files"],
    },
    run: async (args) => {
      if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan — kod o'zgartirish imkonsiz");
      const description = String(args.description || "");
      const files = (args.files || []) as { path: string; content: string }[];
      const { prUrl, branch } = await proposeCodeChange(description, files);
      return { ok: true, prUrl, branch, note: "O'zgarish PR sifatida ochildi" };
    },
  },
  {
    name: "merge_pull_request",
    description: "GitHub Pull Request'ni merge qiladi. PR raqami kerak. Faqat o'z PR'larini merge qilish uchun ishlatiladi.",
    parameters: {
      type: "object",
      properties: {
        pr_number: { type: "number", description: "Merge qilinadigan PR raqami (masalan: 42)" },
      },
      required: ["pr_number"],
    },
    run: async (args) => {
      if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
      const result = await mergePullRequest(Number(args.pr_number));
      return { ok: true, ...result };
    },
  },
  {
    name: "vercel_redeploy",
    description: "Pari AI ilovasini Vercel'da qayta deploy qiladi. PR merge bo'lgandan keyin yangi versiyani ishga tushirish uchun ishlatiladi.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      if (!vercelConfigured) throw new Error("VERCEL_TOKEN sozlanmagan — Vercel dashboard'dan qo'shing");
      const result = await vercelRedeploy();
      return { ok: true, ...result, note: "Deploy boshlandi, 2-3 daqiqada tayyor bo'ladi" };
    },
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
