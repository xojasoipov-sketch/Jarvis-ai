import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";
import { repoConfigured, proposeCodeChange, mergePullRequest } from "@/lib/githubRepo";
import { supabase, dbConfigured } from "@/lib/supabase";
import { connectionsSummaryJson } from "@/lib/connections";
import { internetSearch, fetchUrl, extractFromPage } from "@/lib/web";
import { ENV } from "@/lib/env";

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
