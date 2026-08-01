import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, vercelConfigured, proposeCodeChange, mergePullRequest, vercelRedeploy } from "@/lib/githubRepo";
import { supabase, dbConfigured } from "@/lib/supabase";
import { listServices, listOrders, getOrderStats } from "@/lib/services-store";
import { listModules, listIdeas, MODULE_DEFS } from "@/lib/business-store";
import { listChannels, listPosts } from "@/lib/smm-store";

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
    name: "web_search",
    description: "Internetdan qidiruv qiladi (DuckDuckGo Instant Answer) — hozirgi voqealar, faktlar, ta'riflar uchun",
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
    name: "knowledge_search",
    description: "Supabase Knowledge Hub'dan (pgvector semantic search) shaxsiy bilim bazasini qidiradi. Agentlarga kontekst, kerak bo'lgan ma'lumotlar va eslatmalar uchun ishlatiladi.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Qidiruv so'rovi" } }, required: ["query"] },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const q = String(args.query || "");
      const { data, error } = await supabase!
        .from("pari_knowledge")
        .select("id, title, content, tags, created_at")
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(5);
      if (error) throw new Error(error.message);
      return { query: q, results: (data || []).map(r => ({ title: r.title, content: r.content.slice(0, 400), tags: r.tags })) };
    },
  },
  {
    name: "knowledge_save",
    description: "Yangi bilim, eslatma yoki muhim ma'lumotni Knowledge Hub'ga saqlaydi (Supabase pgvector).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Sarlavha" },
        content: { type: "string", description: "Saqlanadigan mazmun" },
        tags: { type: "array", items: { type: "string" }, description: "Teglar" },
      },
      required: ["title", "content"],
    },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const { data, error } = await supabase!
        .from("pari_knowledge")
        .insert({ title: String(args.title), content: String(args.content), tags: (args.tags as string[]) || [] })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: data?.id, note: "Knowledge Hub'ga saqlandi" };
    },
  },
  {
    name: "create_task",
    description: "Yangi vazifa (task) yaratadi va pari_tasks jadvaliga saqlaydi",
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
        .insert({ title: String(args.title), description: String(args.description || ""), priority: String(args.priority || "medium") })
        .select("id, title")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, task: data, note: "Vazifa yaratildi" };
    },
  },
  {
    name: "list_services",
    description: "Sotiladigan xizmatlar katalogini qaytaradi (nom, narx, tavsif, kategoriya). Foydalanuvchi narxlar, xizmatlar yoki taklif haqida so'rasa ishlatiladi.",
    parameters: { type: "object", properties: { active_only: { type: "boolean", description: "Faqat faol xizmatlarni qaytarish (default: true)" } } },
    run: async (args) => {
      const services = await listServices(args.active_only !== false);
      return {
        services: services.map((s) => ({
          id: s.id, name: s.name, category: s.category, description: s.description,
          price: s.price, currency: s.currency, billing_cycle: s.billing_cycle, active: s.active,
        })),
      };
    },
  },
  {
    name: "list_service_orders",
    description: "Xizmat buyurtmalari ro'yxati va statistikasini qaytaradi (mijozlar, holat, daromad). Biznes holati, buyurtmalar yoki daromad haqida so'ralsa ishlatiladi.",
    parameters: { type: "object", properties: { status: { type: "string", enum: ["new", "in_progress", "delivered", "paid", "cancelled"] } } },
    run: async (args) => {
      const [orders, stats] = await Promise.all([
        listOrders(args.status as never),
        getOrderStats(),
      ]);
      return {
        stats,
        orders: orders.slice(0, 20).map((o) => ({
          id: o.id, client_name: o.client_name, status: o.status, price: o.price, created_at: o.created_at,
        })),
      };
    },
  },
  {
    name: "list_business_modules",
    description: "5 ta biznes yo'nalishi (Faceless YouTube, SMM boshqaruvi, Onlayn kurs, Blogging/Affiliate, AI vositalar)ning holati va yaratilgan g'oyalarini qaytaradi.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const modules = await listModules();
      const withIdeas = await Promise.all(
        modules.map(async (m) => ({
          key: m.module_key,
          name: MODULE_DEFS[m.module_key].name,
          status: m.status,
          revenue: m.revenue,
          ideas_count: (await listIdeas(m.module_key)).length,
        }))
      );
      return { modules: withIdeas };
    },
  },
  {
    name: "get_business_overview",
    description: "Sadining butun biznesi haqida umumiy ko'rinish beradi: xizmatlar, buyurtmalar/daromad, biznes modullari holati va SMM kanallar/postlar statistikasi. Foydalanuvchi 'biznesim qalay' yoki umumiy holat haqida so'raganda ishlatiladi.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const [services, orderStats, modules, channels, posts] = await Promise.all([
        listServices(true),
        getOrderStats(),
        listModules(),
        listChannels(),
        listPosts(),
      ]);
      return {
        services_count: services.length,
        service_orders: orderStats,
        business_modules: modules.map((m) => ({ name: MODULE_DEFS[m.module_key].name, status: m.status, revenue: m.revenue })),
        smm: {
          channels_count: channels.length,
          posts_total: posts.length,
          posts_sent: posts.filter((p) => p.status === "sent").length,
          posts_scheduled: posts.filter((p) => p.status === "scheduled").length,
        },
      };
    },
  },
  {
    name: "web_crawl",
    description: "Berilgan URL'ning barcha ichki linklar orqali kontentini yig'adi (oddiy web crawler, max 5 sahifa)",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Boshlang'ich URL (masalan: https://example.com)" },
        max_pages: { type: "number", description: "Maksimal sahifalar soni (default: 3, max: 5)" },
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
          const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
          if (!res.ok) return;
          const html = await res.text();
          const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleM?.[1]?.trim() || url;
          const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
          results.push({ url, title, excerpt: text });

          // Collect same-origin links
          const base = new URL(url);
          const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
            .map(m => { try { return new URL(m[1], url).href; } catch { return ""; } })
            .filter(h => h.startsWith(base.origin) && !visited.has(h))
            .slice(0, 5);
          for (const link of links) await crawl(link);
        } catch {}
      }

      await crawl(startUrl);
      return { pages_visited: results.length, results };
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
