import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, proposeCodeChange, mergePullRequest } from "@/lib/githubRepo";
import { supabase, dbConfigured } from "@/lib/supabase";
import { connectionsSummaryJson } from "@/lib/connections";
import { internetSearch, fetchUrl, extractFromPage } from "@/lib/web";
import { ENV } from "@/lib/env";
import { rememberFact, listMemory } from "@/lib/memory-store";
import { createHabit, checkinHabit, listHabits } from "@/lib/habits-store";
import { createReminder, listReminders } from "@/lib/reminders-store";
import {
  addTransaction, setBudget, budgetStatus, createGoal, contributeToGoal,
  addSubscription, addDebt, financeSummary,
} from "@/lib/finance-store";
import { queueCommand, listDevices, listCommandHistory } from "@/lib/device-store";
import { AGENTS, callAI, type AgentId } from "@/lib/agents";
import { runOrchestrator } from "@/lib/orchestrator";

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
      "BARCHA ulanishlar inventari: Supabase, Telegram, GitHub, MCP, LLM, internet. 'Nima ulangan?' uchun SHU.",
    parameters: { type: "object", properties: {} },
    run: async () => connectionsSummaryJson(),
  },
  {
    name: "list_mcp_tools",
    description: "Barcha MCP / built-in tool nomlarini ro'yxatla",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      tools: BUILTIN_TOOLS.map((t) => ({ name: t.name, description: t.description })),
      count: BUILTIN_TOOLS.length,
      mcp_servers_json: Boolean(process.env.MCP_SERVERS_JSON),
      mcp_tools_json: Boolean(process.env.MCP_TOOLS_JSON),
    }),
  },
  {
    name: "telegram_send",
    description: "Telegram bot orqali xabar yuborish (TELEGRAM_BOT_TOKEN + chat_id)",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Xabar matni" },
        chat_id: { type: "string", description: "Ixtiyoriy — default TELEGRAM_ADMIN_ID / TELEGRAM_CHAT_ID" },
      },
      required: ["text"],
    },
    run: async (args) => {
      const token = ENV.telegram();
      if (!token) throw new Error("TELEGRAM_BOT_TOKEN yo'q");
      const chatId =
        String(args.chat_id || "") ||
        process.env.TELEGRAM_ADMIN_ID ||
        process.env.TELEGRAM_CHAT_ID ||
        "";
      if (!chatId) throw new Error("chat_id yoki TELEGRAM_ADMIN_ID kerak");
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: String(args.text || ""), parse_mode: "HTML" }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Telegram xato");
      return { ok: true, message_id: data.result?.message_id, chat_id: chatId };
    },
  },
  {
    name: "telegram_get_me",
    description: "Telegram bot info (@username)",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const token = ENV.telegram();
      if (!token) throw new Error("TELEGRAM_BOT_TOKEN yo'q");
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Token xato");
      return { ok: true, bot: data.result };
    },
  },
  {
    name: "get_business_overview",
    description: "Biznes holati (Supabase tasks/projects/knowledge)",
    parameters: { type: "object", properties: {} },
    run: async () => {
      if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
      const [tasks, projects, knowledge] = await Promise.all([
        supabase.from("pari_tasks").select("id, title, status, priority").limit(20),
        supabase.from("pari_projects").select("id, name, status").limit(20),
        supabase.from("pari_knowledge").select("id, title").limit(10),
      ]);
      return {
        tasks: { items: tasks.data || [], error: tasks.error?.message },
        projects: { items: projects.data || [], error: projects.error?.message },
        knowledge: { items: knowledge.data || [], error: knowledge.error?.message },
        note: tasks.error?.message?.includes("does not exist")
          ? "Jadvallar yo'q — SQL migratsiya kerak"
          : "OK",
      };
    },
  },
  {
    name: "create_file",
    description: "Vault/GitHub ga fayl yozish",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("GITHUB_TOKEN / vault sozlanmagan");
      let path = String(args.path || "").replace(/^\/+/, "");
      if (!path.startsWith(ROOT + "/") && !path.startsWith(ROOT)) path = `${ROOT}/${path}`;
      const ok = await writeVaultFile(path, String(args.content || ""), `pari-ai: create ${path}`);
      if (!ok) throw new Error("Yozilmadi");
      return { ok: true, path };
    },
  },
  {
    name: "read_file",
    description: "Vault/GitHub dan o'qish",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      let path = String(args.path || "").replace(/^\/+/, "");
      if (!path.startsWith(ROOT + "/") && !path.startsWith(ROOT)) path = `${ROOT}/${path}`;
      const content = await readVaultFile(path);
      if (content === null) throw new Error(`Topilmadi: ${path}`);
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
    description: "URL matn",
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
    description: "Social linklar",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "social"),
  },
  {
    name: "extract_images",
    description: "Rasmlar",
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
    description: "Ro'yxat",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    run: async (args) => extractFromPage(String(args.url || ""), "list"),
  },
  {
    name: "knowledge_search",
    description: "Knowledge Hub",
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
    description: "Knowledge saqlash",
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
    description: "GitHub PR",
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
      if (!repoConfigured) throw new Error("GITHUB_TOKEN kerak");
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
      if (!repoConfigured) throw new Error("GITHUB_TOKEN kerak");
      return mergePullRequest(Number(args.pr_number));
    },
  },
  // ── Obsidian / Vault tools ──────────────────────────────────────────────────
  {
    name: "obsidian_list",
    description:
      "Obsidian vault da notalar ro'yxati. Folder bo'yicha filter qilish mumkin.",
    parameters: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Papka yo'li (ixtiyoriy)" },
      },
    },
    run: async (args) => {
      const folder = String(args.folder || "");
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      const entries = await listVault(folder);
      return entries.map((e) => ({ path: e.path, type: e.type }));
    },
  },
  {
    name: "obsidian_read",
    description:
      "Obsidian vault dan fayl mazmunini o'qish. Frontmatter ham qaytaradi.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Note yo'li (masalan: vault/notes/idea.md)" },
      },
      required: ["path"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      const content = await readVaultFile(String(args.path));
      if (!content) throw new Error(`Topilmadi: ${args.path}`);
      return { path: args.path, content: content.slice(0, 8000) };
    },
  },
  {
    name: "obsidian_write",
    description:
      "Obsidian vault ga yangi note yozish yoki mavjudini yangilash. Frontmatter avtomatik qo'shiladi.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Note yo'li (masalan: vault/ideas/ai.md)" },
        title: { type: "string", description: "Note sarlavhasi" },
        content: { type: "string", description: "Note mazmuni (markdown)" },
        tags: { type: "array", items: { type: "string" }, description: "Teglar" },
      },
      required: ["path", "content"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      const title = String(args.title || String(args.path).split("/").pop()?.replace(".md", "") || "Note");
      const tags = Array.isArray(args.tags) ? args.tags.map(String) : [];
      const meta = [
        "---",
        `title: ${title}`,
        `date: ${new Date().toISOString().split("T")[0]}`,
        tags.length ? `tags: [${tags.map((t) => `"${t}"`).join(", ")}]` : "",
        "---",
        "",
      ]
        .filter((l) => l !== "")
        .join("\n");
      const full = `${meta}\n${String(args.content)}`;
      const ok = await writeVaultFile(String(args.path), full, `note: ${title}`);
      if (!ok) throw new Error("Note yozilmadi");
      return { ok: true, path: args.path, title, chars: full.length };
    },
  },
  {
    name: "obsidian_search",
    description:
      "Obsidian vault ichida matn qidirish. Natijada fayl yo'li va kontekst qaytadi.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Qidiruv so'rovi" },
      },
      required: ["query"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      const results = await searchVault(String(args.query));
      return results.slice(0, 8).map((r) => ({
        path: r.path,
        excerpt: r.excerpt,
      }));
    },
  },
  {
    name: "obsidian_append",
    description:
      "Mavjud Obsidian notega matn qo'shish (append). Yangi blok note oxiriga qo'shiladi.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Note yo'li" },
        text: { type: "string", description: "Qo'shiladigan matn" },
      },
      required: ["path", "text"],
    },
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan");
      const existing = await readVaultFile(String(args.path));
      const appended = (existing || "") + "\n\n" + String(args.text);
      const ok = await writeVaultFile(String(args.path), appended, `append: ${args.path}`);
      return { ok, path: args.path };
    },
  },
  // ── ElevenLabs TTS tools ────────────────────────────────────────────────────
  {
    name: "tts_generate",
    description:
      "Matnni ovozga aylantirish (ElevenLabs TTS). Ovoz, model, til va voice-settings tanlash mumkin.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Ovozga aylantiriladigan matn (max 5000)" },
        voice_id: { type: "string", description: "ElevenLabs voice ID (ixtiyoriy, default env)" },
        model_id: { type: "string", description: "Model: eleven_turbo_v2_5, eleven_multilingual_v2 va h.k." },
        lang: { type: "string", description: "Til: uz, ru, en" },
      },
      required: ["text"],
    },
    run: async (args) => {
      const key = process.env.ELEVENLABS_API_KEY;
      if (!key) throw new Error("ELEVENLABS_API_KEY yo'q");
      const voiceId = String(args.voice_id || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM");
      const modelId = String(args.model_id || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5");
      const text = String(args.text || "").slice(0, 5000);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`ElevenLabs TTS xato: ${res.status}`);
      return {
        ok: true,
        voice_id: voiceId,
        model_id: modelId,
        chars: text.length,
        hint: "Audio /api/tts endpoint orqali olinadi",
      };
    },
  },
  {
    name: "elevenlabs_voices",
    description: "ElevenLabs mavjud ovozlar ro'yxati",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const key = process.env.ELEVENLABS_API_KEY;
      if (!key) throw new Error("ELEVENLABS_API_KEY yo'q");
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
      }));
    },
  },
  {
    name: "elevenlabs_usage",
    description: "ElevenLabs hisobdagi foydalanish statistikasi (chars, tier, limit)",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const key = process.env.ELEVENLABS_API_KEY;
      if (!key) throw new Error("ELEVENLABS_API_KEY yo'q");
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": key },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sub = data.subscription || {};
      return {
        tier: sub.tier,
        character_count: sub.character_count,
        character_limit: sub.character_limit,
        voice_limit: sub.voice_limit,
      };
    },
  },
  {
    name: "sound_effect_generate",
    description: "Matndan ovozli effekt yaratish (ElevenLabs SFX). Masalan: 'yomg'ir shovqini', 'portlash'",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Effekt tavsifi" },
        duration_seconds: { type: "number", description: "Davomiylik (0.5-22 soniya)" },
      },
      required: ["text"],
    },
    run: async (args) => {
      const key = process.env.ELEVENLABS_API_KEY;
      if (!key) throw new Error("ELEVENLABS_API_KEY yo'q");
      const payload: Record<string, unknown> = {
        text: String(args.text || "").slice(0, 500),
        prompt_influence: 0.3,
      };
      if (args.duration_seconds) {
        payload.duration_seconds = Math.min(22, Math.max(0.5, Number(args.duration_seconds)));
      }
      const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`ElevenLabs SFX xato: ${res.status}`);
      return {
        ok: true,
        text: args.text,
        hint: "Audio /api/elevenlabs/sound-effects endpoint orqali olinadi",
      };
    },
  },
  // ── Computer control tools ───────────────────────────────────────────────
  {
    name: "computer_list",
    description: "Ulangan kompyuterlar ro'yxati (pari-bridge.py orqali ulangan PClar)",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/computer?action=devices`);
      return res.json();
    },
  },
  {
    name: "computer_screenshot",
    description: "Kompyuter ekranini ko'r (screenshot olish). device_id bo'lmasa birinchi onlayn kompyuter ishlatiladi.",
    parameters: {
      type: "object",
      properties: {
        device_id: { type: "string", description: "Kompyuter ID (computer_list dan)" },
      },
    },
    run: async (args) => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      // If no device_id, get first online computer
      let deviceId = String(args.device_id || "");
      if (!deviceId) {
        const list = await fetch(`${base}/api/computer?action=devices`).then(r => r.json()) as { computers: Array<{ id: string; status: string }> };
        const online = list.computers?.find((c) => c.status === "online");
        if (!online) return { error: "Hech qanday kompyuter ulanmagan" };
        deviceId = online.id;
      }
      // Request fresh screenshot via command
      const res = await fetch(`${base}/api/computer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action: "screenshot", payload: {} }),
      });
      const data = await res.json() as { ok: boolean; result?: { resolution?: string } };
      if (data.ok) {
        // Get the stored screenshot
        const ss = await fetch(`${base}/api/computer?action=screenshot&device_id=${deviceId}`).then(r => r.json()) as { b64?: string; resolution?: string };
        return { ok: true, resolution: ss.resolution, screenshot_url: `${base}/api/computer?action=screenshot&device_id=${deviceId}`, note: "Screenshot bazega saqlandi" };
      }
      return data;
    },
  },
  {
    name: "computer_command",
    description: `Kompyuterni boshqar. action turlari:
- screenshot: ekran surati
- shell: buyruq ishlatish (command: "dir" / "ls" / "notepad")
- open: dastur/URL ochish (app: "chrome" / "notepad" / "https://...")
- type: matn yozish (text: "Hello world")
- hotkey: tugmalar kombinatsiyasi (keys: ["ctrl", "c"])
- click: sichqoncha bosish (x, y koordinatlar)
- volume: ovoz balandligi (level: 0-100)
- notify: bildirishnoma (title, message)
- sysinfo: CPU/RAM/disk ma'lumoti
- clipboard_get: bufer mazmuni
- clipboard_set: buferni o'rnatish (text: "...")
- lock: ekranni qulflash`,
    parameters: {
      type: "object",
      properties: {
        device_id: { type: "string", description: "Kompyuter ID" },
        action: { type: "string", description: "Buyruq turi" },
        payload: { type: "object", description: "Buyruq parametrlari" },
      },
      required: ["action"],
    },
    run: async (args) => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      let deviceId = String(args.device_id || "");
      if (!deviceId) {
        const list = await fetch(`${base}/api/computer?action=devices`).then(r => r.json()) as { computers: Array<{ id: string; status: string }> };
        const online = (list.computers || []).find((c) => c.status === "online");
        if (!online) return { error: "Hech qanday kompyuter ulanmagan. pari-bridge.py ni ishga tushiring." };
        deviceId = online.id;
      }
      const res = await fetch(`${base}/api/computer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action: args.action, payload: args.payload || {} }),
      });
      return res.json();
    },
  },

  // ── Phone / Device control tools ─────────────────────────────────────────
  {
    name: "phone_list",
    description: "Ulangan barcha telefonlar / qurilmalarni ro'yxatla (nom, holat, batareya, platforma)",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/phones`);
      return res.json();
    },
  },
  {
    name: "phone_command",
    description: "Telefonga buyruq yubor: call (qo'ng'iroq), sms (xabar), notify (bildirishnoma), open_app, volume, custom",
    parameters: {
      type: "object",
      properties: {
        device_id: { type: "string", description: "Qurilma ID (phone_list dan olinadi)" },
        action: { type: "string", enum: ["call", "sms", "notify", "open_app", "volume", "screen", "custom"], description: "Buyruq turi" },
        payload: { type: "object", description: "Buyruq parametrlari. call: {number}, sms: {number, message}, notify: {title, message}, open_app: {package}, volume: {level: 0-100}, custom: istalgan" },
      },
      required: ["device_id", "action"],
    },
    run: async (args) => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/phones?action=cmd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      return res.json();
    },
  },
  {
    name: "phone_register",
    description: "Yangi telefon/qurilma ro'yxatga olish. webhook_url — Tasker yoki HTTP Shortcuts URL",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Qurilma nomi" },
        platform: { type: "string", enum: ["android", "ios", "other"] },
        webhook_url: { type: "string", description: "Qurilmaning webhook URL (Tasker HTTP server yoki HTTP Shortcuts)" },
      },
      required: ["name"],
    },
    run: async (args) => {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      return res.json();
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
  {
    name: "datetime",
    description: "Sana/vaqt",
    parameters: { type: "object", properties: {} },
    run: async () => ({ iso: new Date().toISOString(), readable: new Date().toString() }),
  },

  // ─── Personal Life ────────────────────────────────────────────────────────
  {
    name: "long_memory_store",
    description: "Foydalanuvchi haqida uzoq muddatli fakt/afzallik/maqsadni eslab qolish (keyingi suhbatlarda ishlatiladi)",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["fact", "preference", "goal", "date"] },
        key: { type: "string", description: "Masalan: sevimli rang" },
        value: { type: "string", description: "Masalan: ko'k" },
        importance: { type: "number", description: "1-5, muhimlik darajasi" },
      },
      required: ["key", "value"],
    },
    run: async (args) => rememberFact({
      category: (args.category as "fact" | "preference" | "goal" | "date") || "fact",
      key: String(args.key), value: String(args.value), importance: Number(args.importance) || undefined,
    }),
  },
  {
    name: "long_memory_retrieve",
    description: "Foydalanuvchi haqida saqlangan xotiradan kontekst olish",
    parameters: { type: "object", properties: { category: { type: "string" } } },
    run: async (args) => ({ items: await listMemory(args.category as "fact" | "preference" | "goal" | "date" | undefined) }),
  },
  {
    name: "reminder_set",
    description: "Eslatma o'rnatish (bir martalik yoki takroriy — tug'ilgan kun, dori, uchrashuv va h.k.)",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_at: { type: "string", description: "ISO sana-vaqt" },
        category: { type: "string", enum: ["general", "birthday", "health", "finance", "travel"] },
        repeat: { type: "string", enum: ["none", "daily", "weekly", "monthly", "yearly"] },
        note: { type: "string" },
      },
      required: ["title", "due_at"],
    },
    run: async (args) => createReminder({
      title: String(args.title), due_at: String(args.due_at),
      category: args.category as "general" | "birthday" | "health" | "finance" | "travel" | undefined,
      repeat: args.repeat as "none" | "daily" | "weekly" | "monthly" | "yearly" | undefined,
      note: args.note ? String(args.note) : undefined,
    }),
  },
  {
    name: "reminder_list",
    description: "Faol eslatmalar ro'yxati",
    parameters: { type: "object", properties: {} },
    run: async () => ({ items: await listReminders() }),
  },
  {
    name: "habit_tracker",
    description: "Yangi kunlik odat yaratish (suv ichish, sport, o'qish va h.k.)",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, emoji: { type: "string" } },
      required: ["title"],
    },
    run: async (args) => createHabit({ title: String(args.title), emoji: args.emoji ? String(args.emoji) : undefined }),
  },
  {
    name: "habit_checkin",
    description: "Bugungi odatni bajarilgan deb belgilash",
    parameters: { type: "object", properties: { habit_id: { type: "string" } }, required: ["habit_id"] },
    run: async (args) => checkinHabit(String(args.habit_id)),
  },
  {
    name: "habit_list",
    description: "Faol odatlar ro'yxati",
    parameters: { type: "object", properties: {} },
    run: async () => ({ items: await listHabits() }),
  },

  // ─── Finance ────────────────────────────────────────────────────────────
  {
    name: "expense_track",
    description: "Xarajat yoki kirim qo'shish",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["income", "expense"] },
        amount: { type: "number" },
        category: { type: "string" },
        note: { type: "string" },
      },
      required: ["type", "amount"],
    },
    run: async (args) => addTransaction({
      type: args.type as "income" | "expense", amount: Number(args.amount),
      category: args.category ? String(args.category) : undefined, note: args.note ? String(args.note) : undefined,
    }),
  },
  {
    name: "budget_create",
    description: "Kategoriya uchun oylik budjet limiti belgilash",
    parameters: {
      type: "object",
      properties: { category: { type: "string" }, monthly_limit: { type: "number" } },
      required: ["category", "monthly_limit"],
    },
    run: async (args) => setBudget(String(args.category), Number(args.monthly_limit)),
  },
  {
    name: "financial_report",
    description: "Joriy oy moliyaviy hisoboti — kirim, chiqim, budjet holati, obunalar, qarzlar",
    parameters: { type: "object", properties: {} },
    run: async () => ({ summary: await financeSummary(), budgets: await budgetStatus() }),
  },
  {
    name: "savings_goal",
    description: "Moliyaviy maqsad yaratish (jamg'arma)",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, target_amount: { type: "number" }, deadline: { type: "string" } },
      required: ["title", "target_amount"],
    },
    run: async (args) => createGoal({ title: String(args.title), target_amount: Number(args.target_amount), deadline: args.deadline ? String(args.deadline) : undefined }),
  },
  {
    name: "savings_goal_contribute",
    description: "Moliyaviy maqsadga pul qo'shish",
    parameters: { type: "object", properties: { id: { type: "string" }, amount: { type: "number" } }, required: ["id", "amount"] },
    run: async (args) => contributeToGoal(String(args.id), Number(args.amount)),
  },
  {
    name: "subscription_manager",
    description: "Takrorlanuvchi to'lov (obuna) qo'shish — Netflix, Spotify va h.k.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, amount: { type: "number" }, cycle: { type: "string", enum: ["monthly", "yearly"] }, next_charge: { type: "string" } },
      required: ["name", "amount", "next_charge"],
    },
    run: async (args) => addSubscription({ name: String(args.name), amount: Number(args.amount), cycle: (args.cycle as "monthly" | "yearly") || "monthly", next_charge: String(args.next_charge) }),
  },
  {
    name: "debt_tracker",
    description: "Qarz qo'shish (men qarzdorman yoki menga qarzdor)",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, amount: { type: "number" }, direction: { type: "string", enum: ["owe", "owed"] }, due_date: { type: "string" } },
      required: ["title", "amount", "direction"],
    },
    run: async (args) => addDebt({ title: String(args.title), amount: Number(args.amount), direction: args.direction as "owe" | "owed", due_date: args.due_date ? String(args.due_date) : undefined }),
  },

  // ─── CRM ────────────────────────────────────────────────────────────────
  {
    name: "crm_contact_add",
    description: "Yangi mijoz qo'shish (CRM)",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, notes: { type: "string" } },
      required: ["name"],
    },
    run: async (args) => {
      if (!dbConfigured) throw new Error("Supabase sozlanmagan");
      const { data, error } = await supabase!.from("pari_clients").insert({
        name: String(args.name), email: args.email, phone: args.phone, company: args.company, notes: args.notes,
      }).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, client: data };
    },
  },

  // ─── Devices (QR-paired qurilmalar) ───────────────────────────────────────
  {
    name: "device_list",
    description: "QR orqali ulangan qurilmalar ro'yxati (Device Manager)",
    parameters: { type: "object", properties: {} },
    run: async () => ({ devices: await listDevices() }),
  },
  {
    name: "device_command",
    description:
      "Pairlangan telefonga (Jarvis Agent ilovasi) buyruq yuboradi va natijani kutib qaytaradi (5 soniyagacha). " +
      "action — device_status/battery_status/storage_status/ram_status/network_status/screen_info: holat so'rash. " +
      "get_location: joylashuv. dial_number(payload.number): terish ekranini ochish. " +
      "open_maps(payload.query)/search_web(payload.query): xarita/qidiruv ochish. " +
      "send_notification(payload.title,message): bildirishnoma. vibrate(payload.duration_ms): tebranish. " +
      "toggle_flashlight(payload.on): fonarcha. set_volume(payload.percent)/get_volume: tovush. " +
      "get_files(payload.path)/get_file_info(payload.path)/read_text_file(payload.path): fayl bilan ishlash. " +
      "write_text_file(payload.path,content)/delete_file(payload.path)/create_folder(payload.path): fayl yozish/o'chirish/yaratish. " +
      "rename_file(payload.from,to)/copy_file(payload.from,to)/download_file(payload.url,filename): fayl ko'chirish. " +
      "get_clipboard/set_clipboard(payload.text): bufer. " +
      "open_app(payload.package)/open_url(payload.url)/share_text(payload.text)/open_settings: ilovalar. " +
      "set_alarm(payload.hour,minute,message): signal qo'yish. list_installed_apps: o'rnatilgan ilovalar. " +
      "terminal_command(payload.cmd): tayyor action mos kelmasa, ilova ega bo'lgan ruxsatlar doirasida " +
      "erkin shell buyruq yozib bajarish uchun — faqat qaytarib bo'lmas/xavfli ish bo'lmasa ishlat. " +
      "hide_app: ilova ikonkasini ilovalar ro'yxatidan yashiradi (fon xizmati ishlashda davom etadi, " +
      "buyruqlarni hamon qabul qiladi — faqat ekranda ko'rinmaydi). show_app: ikonkani qaytadan ko'rsatadi. " +
      "open_autostart_settings: Infinix/Xiaomi/Samsung/Huawei kabi OEM qurilmalarda 'Autostart' yoki " +
      "'Fon ilovalari' sahifasini ochadi — foydalanuvchi Jarvis Agent uchun avtomatik ishga tushishni " +
      "yoqishi kerak bo'lganda ishlat. " +
      "app_version_check: ilovaning joriy va serverdagi eng so'nggi versiyasini solishtiradi. " +
      "update_app: yangi versiya bo'lsa APK'ni avtomatik yuklab olib o'rnatuvchini ochadi.",
    parameters: {
      type: "object",
      properties: {
        device_id: { type: "string", description: "device_list orqali olingan qurilma ID'si" },
        action: {
          type: "string",
          enum: [
            "device_status", "battery_status", "storage_status", "ram_status", "network_status",
            "screen_info", "app_version_info", "get_location", "dial_number", "open_maps", "search_web",
            "send_notification", "vibrate", "toggle_flashlight", "set_volume", "get_volume",
            "get_files", "get_file_info", "read_text_file", "write_text_file", "delete_file",
            "create_folder", "rename_file", "copy_file", "download_file", "get_clipboard",
            "set_clipboard", "open_app", "open_url", "share_text", "open_settings", "set_alarm",
            "list_installed_apps", "open_camera", "take_screenshot", "terminal_command",
            "hide_app", "show_app", "open_autostart_settings",
            "update_app", "app_version_check",
          ],
        },
        payload: { type: "object", description: "action'ga mos parametrlar, masalan {\"number\":\"+998...\"}" },
      },
      required: ["device_id", "action"],
    },
    run: async (args) => {
      const deviceId = String(args.device_id);
      const action = String(args.action);

      // Qurilma haqiqatan ulanganmi? Oxirgi signal 90s dan eski bo'lsa — offline.
      // Buyruqni navbatga qo'yish MUMKIN, lekin AI "bajarildi" deb o'ylamasligi uchun
      // holatni ochiq qaytaramiz.
      const devices = await listDevices();
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        return { executed: false, status: "error", error: `Qurilma topilmadi: ${deviceId}` };
      }
      const lastSeenMs = device.last_seen ? Date.now() - new Date(device.last_seen).getTime() : Infinity;
      if (lastSeenMs > 90_000) {
        const mins = Number.isFinite(lastSeenMs) ? Math.round(lastSeenMs / 60000) : null;
        return {
          executed: false,
          status: "device_offline",
          error:
            `Qurilma OFFLINE — buyruq BAJARILMADI` +
            (mins !== null ? ` (oxirgi signal ~${mins} daqiqa oldin)` : "") +
            `. Telefonda Jarvis Agent ilovasini ochib, fon xizmatini ishga tushiring.`,
        };
      }

      const cmd = await queueCommand(deviceId, action, (args.payload as Record<string, unknown>) || {});
      // Qurilma har ~1s so'rab turadi — natija kelguncha kutamiz, shunda AI
      // "yuborildi" demasdan HAQIQIY natijani (masalan batareya foizi) ayta oladi.
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        const history = await listCommandHistory(deviceId, 10);
        const found = history.find((c) => c.id === cmd.id);
        if (found?.status === "done") {
          return { executed: true, status: "done", result: found.result };
        }
        if (found?.status === "error") {
          return { executed: false, status: "error", error: found.result ?? "Qurilma xato qaytardi" };
        }
      }
      return {
        executed: false,
        status: "timeout",
        error:
          "Qurilma 15 soniyada javob bermadi — buyruq BAJARILMADI deb hisobla. " +
          "Fon xizmati to'xtagan bo'lishi mumkin.",
      };
    },
  },

  // ─── AI Agents / Orchestration ─────────────────────────────────────────────
  {
    name: "agent_run",
    description: "Ma'lum bir ixtisoslashgan agentga (ceo, researcher, coder, analyst, writer, marketing, devops, assistant, architect, debug, security, database, designer, legal, testing, finance, sales, hr) vazifa berish",
    parameters: {
      type: "object",
      properties: { agent_id: { type: "string" }, task: { type: "string" } },
      required: ["agent_id", "task"],
    },
    run: async (args) => {
      const agent = AGENTS[args.agent_id as AgentId];
      if (!agent) throw new Error(`Noma'lum agent: ${args.agent_id}`);
      const result = await callAI(agent.prompt, String(args.task));
      return { agent: agent.name, result };
    },
  },
  {
    name: "orchestrate_goal",
    description: "Murakkab maqsadni bosqichlarga bo'lib, tegishli agentlar bilan oxirigacha bajarish (Jarvis rejimi)",
    parameters: { type: "object", properties: { goal: { type: "string" } }, required: ["goal"] },
    run: async (args) => runOrchestrator(String(args.goal)),
  },

  // ─── Automation Flows ──────────────────────────────────────────────────────
  {
    name: "flow_list",
    description: "Barcha automation flowlarni ro'yxatini olish",
    parameters: { type: "object", properties: {}, required: [] },
    run: async () => {
      const { listFlows } = await import("./automation-store");
      const flows = await listFlows();
      return flows.map((f) => ({ id: f.id, name: f.name, active: f.active, trigger: f.trigger_type, runs: f.runs }));
    },
  },
  {
    name: "flow_run",
    description: "Automation flowni qo'lda ishga tushirish",
    parameters: {
      type: "object",
      properties: {
        flow_id: { type: "string", description: "Flow ID" },
        input: { type: "string", description: "Kirish matni (ixtiyoriy)" },
      },
      required: ["flow_id"],
    },
    run: async (args) => {
      const { getFlow } = await import("./automation-store");
      const { runFlow } = await import("./flow-runner");
      const flow = await getFlow(String(args.flow_id));
      if (!flow) throw new Error("Flow topilmadi");
      return runFlow(flow, "manual", String(args.input || ""));
    },
  },
  {
    name: "flow_create",
    description: "Yangi oddiy automation flow yaratish (trigger → agent → telegram)",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        trigger_type: { type: "string", enum: ["manual", "schedule", "webhook"] },
        cron: { type: "string", description: "Jadval uchun cron ifodasi, masalan '0 9 * * *'" },
      },
      required: ["name"],
    },
    run: async (args) => {
      const { createFlow } = await import("./automation-store");
      const triggerType = (args.trigger_type as string) || "manual";
      const flow = await createFlow({
        name: String(args.name),
        trigger_type: triggerType as "manual" | "schedule" | "webhook",
        trigger_config: args.cron ? { cron: String(args.cron) } : {},
        active: true,
        nodes: [
          { id: "n1", kind: "trigger", type: triggerType, label: triggerType, config: args.cron ? { cron: String(args.cron) } : {} },
          { id: "n2", kind: "action", type: "agent", label: "Assistant", config: { agentId: "assistant" } },
          { id: "n3", kind: "action", type: "telegram", label: "Telegram", config: {} },
          { id: "n4", kind: "output", type: "end", label: "Tugash", config: {} },
        ],
      });
      return { id: flow.id, name: flow.name, created: true };
    },
  },
  // ── NOTION ─────────────────────────────────────────────────────────────────
  {
    name: "notion_search",
    description: "Notion workspace'da sahifa yoki ma'lumot qidirish",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Qidiruv so'zi" },
        limit: { type: "number", description: "Natijalar soni (default 10)" },
      },
      required: ["query"],
    },
    run: async (args) => {
      const { notionSearch } = await import("./notion");
      return notionSearch(String(args.query), Number(args.limit || 10));
    },
  },
  {
    name: "notion_create_page",
    description: "Notion database ga yangi sahifa (yozuv) yaratish",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        database_id: { type: "string", description: "Notion database ID (ixtiyoriy, default ishlatiladi)" },
      },
      required: ["title", "content"],
    },
    run: async (args) => {
      const { notionCreatePage } = await import("./notion");
      return notionCreatePage(String(args.database_id || ""), String(args.title), String(args.content));
    },
  },

  // ── GOOGLE CALENDAR ─────────────────────────────────────────────────────────
  {
    name: "calendar_list",
    description: "Google Calendar'dan kelgusi tadbirlarni ko'rish",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Tadbirlar soni (default 10)" },
        days_ahead: { type: "number", description: "Necha kun oldini ko'rish (default 7)" },
      },
      required: [],
    },
    run: async (args) => {
      const { calendarListEvents } = await import("./google");
      const daysAhead = Number(args.days_ahead || 7);
      const timeMax = new Date(Date.now() + daysAhead * 86400_000).toISOString();
      return calendarListEvents(Number(args.limit || 10), undefined, timeMax);
    },
  },
  {
    name: "calendar_create",
    description: "Google Calendar'da yangi tadbir yaratish",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Tadbir nomi" },
        description: { type: "string" },
        start: { type: "string", description: "Boshlanish vaqti ISO format (2026-08-07T10:00:00)" },
        end: { type: "string", description: "Tugash vaqti ISO format" },
        location: { type: "string" },
      },
      required: ["summary", "start", "end"],
    },
    run: async (args) => {
      const { calendarCreateEvent } = await import("./google");
      return calendarCreateEvent({
        summary: String(args.summary),
        description: args.description ? String(args.description) : undefined,
        start: String(args.start),
        end: String(args.end),
        location: args.location ? String(args.location) : undefined,
      });
    },
  },

  // ── GOOGLE DRIVE ────────────────────────────────────────────────────────────
  {
    name: "drive_search",
    description: "Google Drive'da fayl qidirish",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
    run: async (args) => {
      const { driveSearchFiles } = await import("./google");
      return driveSearchFiles(String(args.query), Number(args.limit || 10));
    },
  },
  {
    name: "drive_upload",
    description: "Google Drive'ga matn fayl yuklash",
    parameters: {
      type: "object",
      properties: {
        file_name: { type: "string" },
        content: { type: "string" },
        mime_type: { type: "string", description: "text/plain, application/json, text/markdown" },
      },
      required: ["file_name", "content"],
    },
    run: async (args) => {
      const { driveUploadFile } = await import("./google");
      return driveUploadFile(String(args.file_name), String(args.content), String(args.mime_type || "text/plain"));
    },
  },

  // ── CANVA ───────────────────────────────────────────────────────────────────
  {
    name: "canva_carousel",
    description: "Instagram karusel uchun Canva'da N ta slide design yaratish",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Karusel sarlavhasi" },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              body: { type: "string" },
            },
          },
          description: "Har bir slide mazmuni",
        },
      },
      required: ["title", "slides"],
    },
    run: async (args) => {
      const { canvaCreateCarousel } = await import("./canva");
      const slides = (args.slides as { heading: string; body: string }[]) || [];
      return canvaCreateCarousel({ title: String(args.title), slideCount: slides.length, slides });
    },
  },
  {
    name: "canva_list",
    description: "Canva'dagi dizainlar ro'yxatini olish",
    parameters: { type: "object", properties: { limit: { type: "number" } }, required: [] },
    run: async (args) => {
      const { canvaListDesigns } = await import("./canva");
      return canvaListDesigns(Number(args.limit || 20));
    },
  },

  // ── CLOUDFLARE ──────────────────────────────────────────────────────────────
  {
    name: "cf_kv_get",
    description: "Cloudflare KV storage dan qiymat o'qish",
    parameters: {
      type: "object",
      properties: {
        namespace_id: { type: "string" },
        key: { type: "string" },
      },
      required: ["namespace_id", "key"],
    },
    run: async (args) => {
      const { cfKvGet } = await import("./cloudflare");
      return cfKvGet(String(args.namespace_id), String(args.key));
    },
  },
  {
    name: "cf_kv_put",
    description: "Cloudflare KV storage ga qiymat yozish",
    parameters: {
      type: "object",
      properties: {
        namespace_id: { type: "string" },
        key: { type: "string" },
        value: { type: "string" },
        ttl: { type: "number", description: "TTL soniyalarda (ixtiyoriy)" },
      },
      required: ["namespace_id", "key", "value"],
    },
    run: async (args) => {
      const { cfKvPut } = await import("./cloudflare");
      return cfKvPut(String(args.namespace_id), String(args.key), String(args.value), args.ttl ? Number(args.ttl) : undefined);
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
