import { NextRequest, NextResponse } from "next/server";
import {
  TgUpdate, sendMessage, sendChatAction, answerCallbackQuery,
  cleanMarkdown, AGENT_KEYBOARD, downloadVoice, getFileUrl,
} from "@/lib/telegram";
import { listChannels, createPost, listPosts, getChannel } from "@/lib/smm-store";
import { listServices, getService, createOrder } from "@/lib/services-store";
import { loadSession, getSession, updateSession, addToHistory, clearHistory } from "@/lib/session-store";
import { classifyFast, normalizeUzbek } from "@/lib/fatosat";
import { getProviders } from "@/lib/providers";
import { runToolLoop, type ChatMessage } from "@/lib/toolloop";
import { log } from "@/lib/logger";
import { portfolioTelegramSummary, guestStartText, SADIPRIME } from "@/lib/sadiprime";
import { isOwnerTelegram, checkGuestTelegramLimit, consumeGuestTelegram, OWNER } from "@/lib/owner";

const TG_SYSTEM = `Sen Pari — Sadining shaxsiy AI yordamchisi. Telegram orqali.

QOIDALAR (buzsiz):
- "Nima qilmoqchisiz?", "Qanday yordam?", "Aniqlashtiring" DEMA. HECH QACHON.
- Buyruq kelsa → darhol bajar. Noaniq bo'lsa → eng mantiqiy talqin qil.
- Tool kerak bo'lsa → CHAQIR, so'rama: get_business_overview, list_services, create_task, knowledge_search, web_search va boshqalar.
- Javob: qisqa, aniq, o'zbek tilida. Markdown yo'q — Telegram oddiy matn.
- Jarvis uslubi: ishonchli, tez, konkret. "Bajarildi." "Tayyor." "Topildi:"`;


const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pari-ai-ten.vercel.app");

const PORTFOLIO_URL = process.env.PORTFOLIO_URL || `${APP_URL}/portfolio`;

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "💬 Chat", callback_data: "menu:chat" },
      { text: "🤖 Agentlar", callback_data: "menu:agents" },
    ],
    [
      { text: "📋 Vazifalar", callback_data: "menu:tasks" },
      { text: "📊 SMM", callback_data: "menu:smm" },
    ],
    [{ text: "🛍️ Xizmatlar", callback_data: "menu:services" }],
    [{ text: "🚀 Pari AI ni ochish", web_app: { url: APP_URL } }],
  ],
};

const GUEST_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🚀 Portfolio va Zakaz — SADI PRIME", web_app: { url: PORTFOLIO_URL } }],
    [{ text: "📞 Bog'lanish", url: `https://t.me/${SADIPRIME.telegram}` }],
  ],
};

async function handleGuestMessage(chatId: number, firstName: string) {
  await sendMessage(
    chatId,
    `Salom, *${firstName}*! 👋\n\n` +
    `*SADI PRIME* — Professional IT xizmatlari\n\n` +
    `🌐 Web saytlar\n📱 Mobil ilovalar\n🤖 AI yechimlar\n📊 SMM va Marketing\n\n` +
    `Portfolio ko'rish va zakaz berish uchun tugmani bosing 👇`,
    GUEST_KEYBOARD
  );
}

// All 18 agents
const AGENT_NAMES: Record<string, string> = {
  ceo: "👔 CEO Agent",
  researcher: "🔬 Research Agent",
  coder: "💻 Coding Agent",
  analyst: "📊 Data Analyst",
  writer: "✍️ Content Writer",
  marketing: "📣 Marketing Agent",
  devops: "⚙️ DevOps Agent",
  assistant: "🎯 Personal Assistant",
  architect: "🏗️ Architect Agent",
  debug: "🐛 Debug Agent",
  security: "🔒 Security Agent",
  database: "🗄️ Database Agent",
  designer: "🎨 Designer Agent",
  legal: "⚖️ Legal Agent",
  testing: "🧪 Testing Agent",
  finance: "💰 Finance Agent",
  sales: "💼 Sales Agent",
  hr: "👥 HR Agent",
};

async function transcribeVoice(fileId: string): Promise<{ transcript: string; reply: string } | null> {
  const blob = await downloadVoice(fileId);
  if (!blob) return null;
  const fd = new FormData();
  fd.append("audio", blob, "voice.ogg");
  const res = await fetch(`${APP_URL}/api/voice`, { method: "POST", body: fd });
  if (!res.ok) return null;
  return res.json();
}

async function callAI(messages: Array<{ role: string; content: string }>, system?: string): Promise<string> {
  const { getProviders } = await import("@/lib/providers");
  const providers = getProviders();
  const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;
  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
        body: JSON.stringify({ model: p.model, messages: msgs, stream: false }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text.trim()) return text.trim();
    } catch { continue; }
  }
  return "Kechirasiz, xato yuz berdi.";
}

async function callAgent(agentId: string, task: string): Promise<string> {
  const res = await fetch(`${APP_URL}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, task }),
  });
  if (!res.ok) return "Agent xato berdi.";
  const data = await res.json();
  return data.result || "Natija bo'sh.";
}

async function handleMessage(chatId: number, text: string, firstName: string) {
  // Load persisted session first (Supabase-backed)
  await loadSession(chatId);
  const session = getSession(chatId);
  const cmd = text.trim().toLowerCase();

  // ─── Commands ───────────────────────────────────────────────────────────────
  if (cmd === "/start") {
    clearHistory(chatId);
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId,
      `Salom, *${firstName}*! 👋\n\nMen *Pari AI* — sizning shaxsiy sun'iy intellekt yordamchingizman.\n\nNima qilishimni xohlaysiz?`,
      MAIN_KEYBOARD
    );
    return;
  }

  if (cmd === "/portfolio") {
    await sendMessage(chatId, portfolioTelegramSummary(), {
      inline_keyboard: [[{ text: "🏢 Portfolio mini-app", web_app: { url: PORTFOLIO_URL } }]],
    });
    return;
  }

  if (cmd === "/app") {
    await sendMessage(chatId, `🚀 *Pari AI*:`, {
      inline_keyboard: [[{ text: "Ochish", web_app: { url: APP_URL } }]],
    });
    return;
  }

  if (cmd === "/qr" || cmd === "/ulan" || cmd === "/telefon") {
    const deviceId = crypto.randomUUID();
    // QR → setup page (user-friendly), not raw webhook URL
    const setupUrl = `${APP_URL}/setup/phone?device_id=${deviceId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(setupUrl)}`;

    try {
      const { sendPhoto } = await import("@/lib/telegram");
      await sendPhoto(chatId, qrImageUrl,
        `📱 *Telefonni ulash*\n\n` +
        `QR kodni telefon kamerasi bilan skanerlang — sahifa ochiladi va avtomatik ulanadi.\n\n` +
        `Yoki havolaga o'ting:\n${setupUrl}`,
        {
          inline_keyboard: [
            [{ text: "📱 Ulash sahifasi", url: setupUrl }],
            [{ text: "🖥 Qurilmalar paneli", web_app: { url: `${APP_URL}/devices` } }],
          ],
        }
      );
    } catch {
      await sendMessage(chatId,
        `📱 *Telefonni ulash*\n\nHavolaga o'ting:\n${setupUrl}`,
        { inline_keyboard: [[{ text: "📱 Ulash sahifasi", url: setupUrl }]] }
      );
    }
    return;
  }

  if (cmd === "/help" || cmd === "/yordam") {
    await sendMessage(chatId,
      `*Pari AI buyruqlari:*\n\n` +
      `/start — Bosh menyu\n` +
      `/chat — Chat rejimi\n` +
      `/agents — Agent tanlash\n` +
      `/smm — SMM boshqaruvi\n` +
      `/kanallar — Ulangan kanallar\n` +
      `/generate [mavzu] — AI post yaratish\n` +
      `/post [matn] — Kanalga post yuborish\n` +
      `/xizmatlar — Sotiladigan xizmatlar katalogi\n` +
      `/zakaz — Zakaz berish (portfolio orqali)\n` +
      `/qr — Telefon ulash QR kodi\n` +
      `/clear — Suhbatni tozalash\n` +
      `/status — Tizim holati\n` +
      `/app — Ilovani ochish\n\n` +
      `*18 ta agent:*\n` +
      Object.entries(AGENT_NAMES).map(([, v]) => `• ${v}`).join("\n")
    );
    return;
  }

  if (cmd === "/smm") {
    const channels = await listChannels();
    if (channels.length === 0) {
      await sendMessage(chatId,
        `📊 *SMM boshqaruvi*\n\nHali ulangan kanal yo'q.\n\nBot'ni kanalingizga admin sifatida qo'shing, keyin web ilovadan kanal ulang:`,
        { inline_keyboard: [[{ text: "⚙️ SMM sozlamalari", web_app: { url: `${APP_URL}/smm` } }]] }
      );
    } else {
      const posts = await listPosts();
      const sent = posts.filter((p) => p.status === "sent").length;
      const scheduled = posts.filter((p) => p.status === "scheduled").length;
      const draft = posts.filter((p) => p.status === "draft").length;
      const stats = channels.map((c) => `• *${c.title}* (@${c.username || "?"}) — ${c.category}`).join("\n");
      await sendMessage(chatId,
        `📊 *SMM boshqaruvi*\n\n*Kanallar (${channels.length}):*\n${stats}\n\n` +
        `*Statistika:* ${posts.length} post | ✅ ${sent} yuborilgan | 📅 ${scheduled} rejalashtirilgan | 📝 ${draft} draft`,
        {
          inline_keyboard: [
            [
              { text: "✍️ Post yaratish", callback_data: "smm:create" },
              { text: "✨ AI bilan yaratish", callback_data: "smm:aiwrite" },
            ],
            [
              { text: "📅 Rejalashtirilganlar", callback_data: "smm:scheduled" },
              { text: "⚙️ Sozlamalar", web_app: { url: `${APP_URL}/smm` } },
            ],
          ]
        }
      );
    }
    return;
  }

  if (cmd === "/xizmatlar") {
    await sendServiceCatalog(chatId);
    return;
  }

  if (cmd === "/zakaz" || cmd === "/order") {
    const portfolioUrl = `${APP_URL}/portfolio`;
    await sendMessage(chatId,
      `📦 *Zakaz berish*\n\n` +
      `Portfoliomizni ko'rib, kerakli xizmatni tanlang va forma orqali zakaz bering.\n\n` +
      `Yoki to'g'ridan-to'g'ri yozing:\n` +
      `• Qanday xizmat kerak\n` +
      `• Qisqacha loyiha haqida\n\n` +
      `📱 @xojasoipov`,
      {
        inline_keyboard: [
          [{ text: "🏢 Portfolio va Zakaz", web_app: { url: portfolioUrl } }],
          [{ text: "💬 Telegram orqali yozish", url: "https://t.me/xojasoipov" }],
        ],
      }
    );
    return;
  }

  if (cmd === "/kanallar") {
    const channels = await listChannels();
    if (channels.length === 0) {
      await sendMessage(chatId, "Hali ulangan kanal yo'q. /smm orqali sozlang.");
    } else {
      const list = channels.map((c, i) => `${i + 1}. *${c.title}*\n   @${c.username || "?"} · ID: \`${c.chat_id}\` · ${c.category}`).join("\n\n");
      await sendMessage(chatId, `📡 *Ulangan kanallar (${channels.length}):*\n\n${list}`);
    }
    return;
  }

  if (cmd.startsWith("/post ") || cmd.startsWith("/post\n")) {
    const content = text.slice(6).trim();
    if (!content) { await sendMessage(chatId, "Ishlatish: `/post Matn yozing`"); return; }
    const channels = await listChannels();
    if (channels.length === 0) { await sendMessage(chatId, "Avval kanal ulang. /smm yozing."); return; }
    updateSession(chatId, { mode: "smm_post", smmContent: content });
    if (channels.length === 1) {
      await sendMessage(chatId,
        `✍️ *${channels[0].title}* kanaliga:\n\n${content}\n\nYuborilsinmi?`,
        { inline_keyboard: [[{ text: "✅ Yuborish", callback_data: `smm:publish:${channels[0].id}` }, { text: "❌ Bekor", callback_data: "smm:cancel" }]] }
      );
    } else {
      const buttons = channels.map((c) => [{ text: c.title, callback_data: `smm:publish:${c.id}` }]);
      buttons.push([{ text: "❌ Bekor", callback_data: "smm:cancel" }]);
      await sendMessage(chatId, `📡 Qaysi kanalga yuboramiz?\n\n_${content}_`, { inline_keyboard: buttons });
    }
    return;
  }

  if (cmd.startsWith("/generate ") || cmd.startsWith("/generate\n")) {
    const topic = text.slice(10).trim();
    if (!topic) { await sendMessage(chatId, "Ishlatish: `/generate Mavzu nomi`"); return; }
    await sendChatAction(chatId);
    await sendMessage(chatId, `✨ *${topic}* mavzusida post yaratyapman...`);
    try {
      const res = await fetch(`${APP_URL}/api/smm/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: 3 }),
      });
      const data = await res.json();
      const posts: string[] = data.posts || [];
      if (!posts.length) throw new Error("Bo'sh javob");
      updateSession(chatId, { mode: "smm_generated", smmDrafts: posts });
      const numbered = posts.map((p, i) => `*${i + 1}.*\n${p}`).join("\n\n──────\n\n");
      const buttons = posts.map((_, i) => ({ text: `${i + 1}-variantni olish`, callback_data: `smm:use:${i}` }));
      await sendMessage(chatId,
        `✨ *Yaratilgan postlar:*\n\n${numbered}`,
        { inline_keyboard: [buttons, [{ text: "❌ Bekor", callback_data: "smm:cancel" }]] }
      );
    } catch (e) {
      await sendMessage(chatId, `❌ Post yaratishda xato: ${String(e)}`);
    }
    return;
  }

  if (cmd === "/agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "🤖 Qaysi agent bilan ishlashni xohlaysiz?", AGENT_KEYBOARD);
    return;
  }

  if (cmd === "/chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 Chat rejimi.");
    return;
  }

  if (cmd === "/clear") {
    clearHistory(chatId);
    await sendMessage(chatId, "✅ Tozalandi.");
    return;
  }

  if (cmd === "/status") {
    const agentName = session.agentId ? (AGENT_NAMES[session.agentId] || session.agentId) : "—";
    await sendMessage(chatId,
      `*Tizim holati:* ✅ Ishlayapti\n\n` +
      `*Rejim:* ${session.mode === "agent" ? `Agent (${agentName})` : session.mode}\n` +
      `*Suhbat tarixi:* ${session.history.length} xabar\n` +
      `*Vaqt:* ${new Date().toLocaleString("uz-UZ")}`
    );
    return;
  }

  // ─── Fatosat: intent-based quick routing ───────────────────────────────────
  const normalized = normalizeUzbek(text);
  const fastIntent = classifyFast(normalized);

  if (fastIntent?.type === "task") {
    const { supabase, dbConfigured } = await import("@/lib/supabase");
    if (dbConfigured) {
      void supabase!.from("pari_tasks").insert({ title: fastIntent.title, status: "todo" });
    }
    await sendMessage(chatId, `✅ Vazifa qo'shildi: *${fastIntent.title}*\n\nVazifalarni ko'rish uchun:`,
      { inline_keyboard: [[{ text: "📋 Vazifalar", web_app: { url: `${APP_URL}/tasks` } }]] }
    );
    return;
  }

  if (fastIntent?.type === "navigate") {
    await sendMessage(chatId, `🔗 Sahifaga o'tish:`,
      { inline_keyboard: [[{ text: "Ochish", web_app: { url: `${APP_URL}${fastIntent.page}` } }]] }
    );
    return;
  }

  if (fastIntent?.type === "services") {
    await sendServiceCatalog(chatId);
    return;
  }

  // Service order mode: waiting for client name
  if (session.mode === "service_order" && session.orderServiceId && !session.orderClientName) {
    const service = await getService(session.orderServiceId);
    updateSession(chatId, { orderClientName: text.trim() });
    await sendMessage(chatId,
      `Rahmat, *${text.trim()}*!\n\nEndi kontakt ma'lumotingizni yozing (telefon yoki @username), Sadi tez orada bog'lanadi.\n\n_Xizmat: ${service?.name || "?"}_`
    );
    return;
  }

  if (session.mode === "service_order" && session.orderServiceId && session.orderClientName) {
    const service = await getService(session.orderServiceId);
    const order = await createOrder({
      service_id: session.orderServiceId,
      client_name: session.orderClientName,
      client_contact: text.trim(),
      status: "new",
      price: service?.price,
      notes: `Telegram orqali: @${firstName}`,
    });
    updateSession(chatId, { mode: "chat", orderServiceId: undefined, orderClientName: undefined });
    await sendMessage(chatId,
      `✅ *Buyurtma qabul qilindi!*\n\n` +
      `Xizmat: *${service?.name || "?"}*\n` +
      `Buyurtma raqami: #${order.id}\n\n` +
      `Sadi tez orada siz bilan bog'lanadi. Rahmat!`,
      MAIN_KEYBOARD
    );
    return;
  }

  // SMM mode: waiting for content
  if (session.mode === "smm_post" && session.smmChannelId) {
    updateSession(chatId, { smmContent: text });
    const channels = await listChannels();
    const ch = channels.find((c) => c.id === session.smmChannelId);
    await sendMessage(chatId,
      `✍️ *${ch?.title || "Kanal"}* kanaliga:\n\n${text}\n\nYuborilsinmi?`,
      { inline_keyboard: [[{ text: "✅ Yuborish", callback_data: `smm:publish:${session.smmChannelId}` }, { text: "❌ Bekor", callback_data: "smm:cancel" }]] }
    );
    return;
  }

  // ─── Agent mode ─────────────────────────────────────────────────────────────
  if (session.mode === "agent" && session.agentId) {
    await sendChatAction(chatId);
    const agentName = AGENT_NAMES[session.agentId] || session.agentId;

    // Auto-route to appropriate agent if fatosat detects a different intent
    let targetAgentId = session.agentId;
    if (fastIntent?.type === "agent") targetAgentId = fastIntent.agentId;

    await sendMessage(chatId, `⏳ *${AGENT_NAMES[targetAgentId] || targetAgentId}* ishlayapti...`);
    try {
      const result = await callAgent(targetAgentId, text);
      addToHistory(chatId, "user", text);
      addToHistory(chatId, "assistant", result);
      await sendMessage(chatId,
        `*${agentName} javobi:*\n\n${cleanMarkdown(result)}`,
        {
          inline_keyboard: [
            [{ text: "🔄 Yana so'rash", callback_data: `agent:${targetAgentId}` }],
            [{ text: "🤖 Boshqa agent", callback_data: "menu:agents" }, { text: "💬 Chat", callback_data: "menu:chat" }],
          ]
        }
      );
    } catch {
      await sendMessage(chatId, "❌ Agent xato.");
    }
    return;
  }

  // Auto-route to agent if fatosat detects strong intent
  if (fastIntent?.type === "agent" && session.mode === "chat") {
    await sendChatAction(chatId);
    const agentId = fastIntent.agentId;
    const agentName = AGENT_NAMES[agentId] || agentId;
    await sendMessage(chatId, `⏳ *${agentName}* orqali javob tayyorlanmoqda...`);
    try {
      const result = await callAgent(agentId, text);
      addToHistory(chatId, "user", text);
      addToHistory(chatId, "assistant", result);
      await sendMessage(chatId,
        `*${agentName}:*\n\n${cleanMarkdown(result)}`,
        { inline_keyboard: [[{ text: "💬 Davom etish", callback_data: "menu:chat" }, { text: "🤖 Agentlar", callback_data: "menu:agents" }]] }
      );
    } catch {
      // Fall through to regular chat
      await regularChat(chatId, text, session.history);
    }
    return;
  }

  // ─── Regular chat ───────────────────────────────────────────────────────────
  await regularChat(chatId, text, session.history);
}

const CATEGORY_LABEL: Record<string, string> = {
  smm: "SMM", content: "Kontent", dev: "Dasturlash", design: "Dizayn",
  consulting: "Konsultatsiya", automation: "Avtomatlashtirish", general: "Umumiy",
};

async function sendServiceCatalog(chatId: number) {
  const services = await listServices(true);
  if (services.length === 0) {
    await sendMessage(chatId, "🛍️ Hozircha xizmatlar katalogi bo'sh.");
    return;
  }
  await sendMessage(chatId, `🛍️ *Sotiladigan xizmatlar*\n\nQuyidagi xizmatlardan birini tanlang:`);
  for (const s of services) {
    const cycleLabel = s.billing_cycle === "monthly" ? "/oy" : s.billing_cycle === "weekly" ? "/hafta" : "";
    const features = s.features.slice(0, 4).map((f) => `• ${f}`).join("\n");
    await sendMessage(chatId,
      `*${s.name}* _(${CATEGORY_LABEL[s.category] || s.category})_\n\n` +
      `${s.description}\n\n` +
      (features ? `${features}\n\n` : "") +
      `💰 *${s.price.toLocaleString()} ${s.currency}${cycleLabel}* · 🕐 ${s.delivery_days} kunda tayyor`,
      { inline_keyboard: [[{ text: "🛒 Buyurtma berish", callback_data: `svc:order:${s.id}` }]] }
    );
  }
}

async function regularChat(chatId: number, text: string, _history: Array<{ role: "user" | "assistant"; content: string }>) {
  await sendChatAction(chatId);
  addToHistory(chatId, "user", text);

  const providers = getProviders();
  const toolProvider = providers.find((p) => p.supportsTools && p.key !== "dummy");

  try {
    let reply: string;
    if (toolProvider) {
      try {
        const convo: ChatMessage[] = [{ role: "system", content: TG_SYSTEM }, ...getSession(chatId).history];
        reply = await runToolLoop(toolProvider, convo);
      } catch {
        reply = await callAI(getSession(chatId).history, TG_SYSTEM);
      }
    } else {
      reply = await callAI(getSession(chatId).history, TG_SYSTEM);
    }
    addToHistory(chatId, "assistant", reply);
    await sendMessage(chatId, cleanMarkdown(reply));
  } catch {
    await sendMessage(chatId, "❌ Xato.");
  }
}

async function handleCallback(
  callbackId: string,
  chatId: number,
  data: string,
  firstName: string,
  isOwner: boolean
) {
  await answerCallbackQuery(callbackId);

  if (data === "guest:projects" || data === "guest:services") {
    await sendMessage(chatId, portfolioTelegramSummary(), GUEST_KEYBOARD);
    return;
  }

  if (!isOwner) {
    await handleGuestMessage(chatId, firstName);
    return;
  }

  if (data.startsWith("agent:")) {
    const agentId = data.split(":")[1];
    updateSession(chatId, { mode: "agent", agentId });
    const agentName = AGENT_NAMES[agentId] || agentId;
    await sendMessage(chatId,
      `${agentName} *tanlandi!* ✅\n\n` +
      `Endi vazifangizni yozing.\n\n` +
      `_Masalan: "Pari AI uchun marketing strategiyasini ishlab chiq"_`
    );
    return;
  }
  if (data === "menu:chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 Chat.");
    return;
  }
  if (data === "menu:agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "🤖 Qaysi agent bilan ishlashni xohlaysiz?", AGENT_KEYBOARD);
    return;
  }
  if (data === "menu:tasks") {
    await sendMessage(chatId, `📋 *Vazifalar*\n\nVazifalarni web ilovadan boshqaring:`,
      { inline_keyboard: [[{ text: "📋 Vazifalar", web_app: { url: `${APP_URL}/tasks` } }]] }
    );
    return;
  }

  if (data === "menu:projects") {
    await sendMessage(chatId, `📁 *Loyihalar*`,
      { inline_keyboard: [[{ text: "📁 Loyihalar", web_app: { url: `${APP_URL}/projects` } }]] }
    );
    return;
  }

  if (data === "menu:help") { await handleMessage(chatId, "/help", firstName); return; }
  if (data === "menu:smm") { await handleMessage(chatId, "/smm", firstName); return; }
  if (data === "menu:services") { await sendServiceCatalog(chatId); return; }

  if (data.startsWith("svc:order:")) {
    const serviceId = parseInt(data.split(":")[2], 10);
    const service = await getService(serviceId);
    if (!service) { await sendMessage(chatId, "Xizmat topilmadi."); return; }
    updateSession(chatId, { mode: "service_order", orderServiceId: serviceId, orderClientName: undefined });
    await sendMessage(chatId,
      `🛒 *${service.name}* uchun buyurtma\n\nIsmingizni yozing:`
    );
    return;
  }

  if (data === "smm:aiwrite") {
    updateSession(chatId, { mode: "smm_post" });
    await sendMessage(chatId,
      `✨ *AI bilan post yaratish*\n\nMavzuni yozing:\n/generate [mavzu]\n\n_Masalan: /generate Startap uchun 5 ta maslahat_`
    );
    return;
  }

  if (data === "smm:scheduled") {
    const posts = await listPosts();
    const scheduled = posts.filter((p) => p.status === "scheduled");
    if (scheduled.length === 0) {
      await sendMessage(chatId, "📅 Rejalashtirilgan postlar yo'q.");
    } else {
      const list = scheduled.map((p) => {
        const time = p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("uz-UZ") : "?";
        return `📅 ${time}\n${p.content.slice(0, 80)}...`;
      }).join("\n\n");
      await sendMessage(chatId, `📅 *Rejalashtirilgan postlar (${scheduled.length}):*\n\n${list}`);
    }
    return;
  }

  if (data.startsWith("smm:publish:")) {
    const channelId = data.split(":")[2];
    const session = getSession(chatId);
    const content = session.smmContent;
    if (!content) { await sendMessage(chatId, "Post matni topilmadi."); return; }
    const channel = await getChannel(channelId);
    if (!channel) { await sendMessage(chatId, "Kanal topilmadi."); return; }
    await sendMessage(chatId, "⏳ Yuborilmoqda...");
    const post = await createPost({ channel_id: channelId, content, status: "draft" });
    const res = await fetch(`${APP_URL}/api/smm/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    const result = await res.json();
    if (result.ok) {
      await sendMessage(chatId,
        `✅ *${channel.title}* kanaliga muvaffaqiyatli yuborildi!`,
        { inline_keyboard: [[{ text: "📊 SMM", callback_data: "menu:smm" }, { text: "➕ Yangi post", callback_data: "smm:create" }]] }
      );
    } else {
      await sendMessage(chatId, `❌ Xato: ${result.error || "Noma'lum xato"}\n\nBot kanalda admin ekanligini tekshiring.`);
    }
    updateSession(chatId, { mode: "chat", smmContent: undefined, smmChannelId: undefined });
    return;
  }

  if (data.startsWith("smm:use:")) {
    const idx = parseInt(data.split(":")[2], 10);
    const session = getSession(chatId);
    const content = (session.smmDrafts || [])[idx];
    if (!content) { await sendMessage(chatId, "Draft topilmadi."); return; }
    const channels = await listChannels();
    if (channels.length === 0) { await sendMessage(chatId, "Kanal ulangan emas. /smm orqali qo'shing."); return; }
    updateSession(chatId, { mode: "smm_post", smmContent: content, smmDrafts: undefined });
    if (channels.length === 1) {
      await sendMessage(chatId,
        `✍️ *${channels[0].title}* kanaliga:\n\n${content}\n\nYuborilsinmi?`,
        { inline_keyboard: [[{ text: "✅ Yuborish", callback_data: `smm:publish:${channels[0].id}` }, { text: "❌ Bekor", callback_data: "smm:cancel" }]] }
      );
    } else {
      const buttons = channels.map((c) => [{ text: c.title, callback_data: `smm:publish:${c.id}` }]);
      buttons.push([{ text: "❌ Bekor", callback_data: "smm:cancel" }]);
      await sendMessage(chatId, `📡 Qaysi kanalga?\n\n${content}`, { inline_keyboard: buttons });
    }
    return;
  }

  if (data === "smm:create") {
    updateSession(chatId, { mode: "smm_post" });
    await sendMessage(chatId,
      `✍️ *Yangi post*\n\nQo'lda:\n/post Matn yozing\n\nAI bilan:\n/generate Mavzu nomi`,
      { inline_keyboard: [[{ text: "⚙️ SMM sahifasi", web_app: { url: `${APP_URL}/smm` } }]] }
    );
    return;
  }

  if (data === "smm:cancel") {
    updateSession(chatId, { mode: "chat", smmContent: undefined, smmChannelId: undefined, smmDrafts: undefined });
    await sendMessage(chatId, "❌ Bekor qilindi.", MAIN_KEYBOARD);
    return;
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TgUpdate = await req.json();

    if (update.message?.text) {
      const { chat, text, from } = update.message;
      const owner = isOwnerTelegram(from);
      log("info", "telegram", `from ${from?.username || from?.id} owner=${owner}`);
      if (!owner) {
        await handleGuestMessage(chat.id, from.first_name);
        return NextResponse.json({ ok: true });
      }
      await handleMessage(chat.id, text, from.first_name);
    }

    if (update.message?.voice || update.message?.audio) {
      const { chat, from } = update.message;
      const owner = isOwnerTelegram(from);
      if (!owner) {
        await handleGuestMessage(chat.id, from.first_name);
        return NextResponse.json({ ok: true });
      }
      const fileId = (update.message.voice || update.message.audio)!.file_id;
      await sendChatAction(chat.id, "typing");
      try {
        const result = await transcribeVoice(fileId);
        if (result?.transcript) {
          addToHistory(chat.id, "user", result.transcript);
          addToHistory(chat.id, "assistant", result.reply);
          await sendMessage(chat.id, `🎤 _"${result.transcript}"_\n\n${cleanMarkdown(result.reply)}`);
        } else {
          await sendMessage(chat.id, "Ovozni tushunmadim.");
        }
      } catch {
        await sendMessage(chat.id, "Ovoz xatosi.");
      }
    }

    if (update.message?.photo) {
      const { chat, from, photo, caption } = update.message;
      const largest = photo[photo.length - 1];
      await sendChatAction(chat.id, "typing");
      try {
        const url = await getFileUrl(largest.file_id);
        const prompt = caption || "Bu rasmda nima ko'rsatilgan? Tavsiflab bering.";
        const reply = await callAI(
          [{ role: "user", content: `Foydalanuvchi rasm yubordi (${largest.width}x${largest.height}px). URL: ${url || "yuklab bo'lmadi"}.\n\nSo'rov: ${prompt}` }],
          "Sen ko'p modalli AI yordamchisan. Rasm tavsifi yoki savolga qisqa javob ber."
        );
        await sendMessage(chat.id, cleanMarkdown(reply));
      } catch {
        await sendMessage(chat.id, "Rasmni qayta ishlashda xato.");
      }
      log("info", "telegram", `Rasm from @${from.first_name}`);
    }

    if (update.message?.document) {
      const { chat, from, document, caption } = update.message;
      const { file_name, mime_type, file_size } = document;
      const sizeKb = file_size ? Math.round(file_size / 1024) : "?";
      await sendChatAction(chat.id, "typing");
      try {
        const url = await getFileUrl(document.file_id);
        const isText = mime_type?.startsWith("text/") || /\.(txt|md|csv|json|yaml|py|js|ts)$/i.test(file_name || "");
        if (isText && url) {
          const fileRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const text = (await fileRes.text()).slice(0, 8000);
          const question = caption || "Bu faylni tahlil qilib, asosiy ma'lumotlarni chiqarib ber.";
          const reply = await callAI(
            [{ role: "user", content: `Fayl: ${file_name}\n\nMazmun:\n${text}\n\nSo'rov: ${question}` }]
          );
          await sendMessage(chat.id, `📄 *${file_name}* (${sizeKb}KB)\n\n${cleanMarkdown(reply)}`);
        } else {
          await sendMessage(chat.id,
            `📎 *${file_name || "Fayl"}* (${sizeKb}KB) qabul qilindi.\n_${mime_type || "noma'lum tur"}_\n\nTo'liq tahlil uchun web ilovaga o'ting:`,
            { inline_keyboard: [[{ text: "📁 Files", web_app: { url: `${APP_URL}/files` } }]] }
          );
        }
      } catch {
        await sendMessage(chat.id, "Faylni o'qishda xato yuz berdi.");
      }
      log("info", "telegram", `Hujjat "${document.file_name}" from @${from.first_name}`);
    }

    if (update.callback_query) {
      const { id, message, data, from } = update.callback_query;
      await handleCallback(id, message.chat.id, data, from.first_name, isOwnerTelegram(from));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    log("error", "telegram", `Webhook xatosi: ${(e as Error).message}`);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    portfolio: PORTFOLIO_URL,
    brand: SADIPRIME.brand,
  });
}
