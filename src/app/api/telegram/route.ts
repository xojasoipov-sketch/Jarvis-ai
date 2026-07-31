import { NextRequest, NextResponse } from "next/server";
import {
  TgUpdate, sendMessage, sendChatAction, answerCallbackQuery,
  cleanMarkdown, AGENT_KEYBOARD, downloadVoice,
} from "@/lib/telegram";
import { listChannels, createPost, listPosts, getChannel } from "@/lib/smm-store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pari-ai-ten.vercel.app");

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
    [{ text: "🚀 Pari AI ilovasini ochish", web_app: { url: APP_URL } }],
  ],
};
import { getSession, updateSession, addToHistory, clearHistory } from "@/lib/session-store";
import { log } from "@/lib/logger";

const AGENT_NAMES: Record<string, string> = {
  ceo: "👔 CEO Agent", researcher: "🔬 Research Agent", coder: "💻 Coding Agent",
  analyst: "📊 Data Analyst", writer: "✍️ Content Writer", marketing: "📣 Marketing Agent",
  devops: "⚙️ DevOps Agent", assistant: "🎯 Personal Assistant",
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
  const session = getSession(chatId);
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start") {
    clearHistory(chatId);
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId,
      `Salom, *${firstName}*! 👋\n\nMen *Pari AI* — sizning shaxsiy sun'iy intellekt yordamchingizman.\n\n` +
      `Nima qilishimni xohlaysiz?`,
      MAIN_KEYBOARD
    );
    return;
  }

  if (cmd === "/app") {
    await sendMessage(chatId, `🚀 *Pari AI* — to'liq ilovani oching:`, {
      inline_keyboard: [[{ text: "🚀 Pari AI ni ochish", web_app: { url: APP_URL } }]],
    });
    return;
  }

  if (cmd === "/help" || cmd === "/yordam") {
    await sendMessage(chatId,
      `*Pari AI buyruqlari:*\n\n` +
      `/start — Bosh menyu\n` +
      `/agents — Agent tanlash\n` +
      `/chat — Chat rejimi\n` +
      `/smm — SMM boshqaruvi\n` +
      `/clear — Suhbatni tozalash\n` +
      `/status — Tizim holati\n\n` +
      `*SMM buyruqlari:*\n` +
      `/post [matn] — Kanalga post yuborish\n` +
      `/generate [mavzu] — AI post yaratish\n` +
      `/kanallar — Ulangan kanallar\n\n` +
      `*Agentlar:*\n` +
      Object.entries(AGENT_NAMES).map(([, v]) => `• ${v}`).join("\n")
    );
    return;
  }

  if (cmd === "/smm") {
    const channels = await listChannels();
    if (channels.length === 0) {
      await sendMessage(chatId,
        `📊 *SMM boshqaruvi*\n\nHali ulangan kanal yo'q.\n\nQo'shish uchun web ilovani oching:`,
        { inline_keyboard: [[{ text: "⚙️ SMM sozlamalari", web_app: { url: `${APP_URL}/smm` } }]] }
      );
    } else {
      const stats = channels.map((c) => `• *${c.title}* (@${c.username || "?"})`).join("\n");
      const posts = await listPosts();
      const sent = posts.filter((p) => p.status === "sent").length;
      const scheduled = posts.filter((p) => p.status === "scheduled").length;
      await sendMessage(chatId,
        `📊 *SMM boshqaruvi*\n\n*Kanallar:*\n${stats}\n\n*Jami:* ${posts.length} post | ${sent} yuborilgan | ${scheduled} rejalashtirilgan`,
        {
          inline_keyboard: [
            [{ text: "✍️ Post yaratish", callback_data: "smm:create" }, { text: "📅 Rejalashtirish", callback_data: "smm:schedule" }],
            [{ text: "⚙️ Sozlamalar", web_app: { url: `${APP_URL}/smm` } }],
          ]
        }
      );
    }
    return;
  }

  if (cmd === "/kanallar") {
    const channels = await listChannels();
    if (channels.length === 0) {
      await sendMessage(chatId, "Hali ulangan kanal yo'q. /smm orqali qo'shing.");
    } else {
      const list = channels.map((c, i) => `${i + 1}. *${c.title}* — @${c.username || "?"}  (${c.category})`).join("\n");
      await sendMessage(chatId, `📡 *Ulangan kanallar:*\n\n${list}`);
    }
    return;
  }

  if (cmd.startsWith("/post ") || cmd.startsWith("/post\n")) {
    const content = text.slice(6).trim();
    if (!content) { await sendMessage(chatId, "Ishlatish: `/post Matn yozing`"); return; }
    const channels = await listChannels();
    if (channels.length === 0) { await sendMessage(chatId, "Avval kanal qo'shing. /smm yozing."); return; }
    updateSession(chatId, { mode: "smm_post", smmChannelId: channels[0].id, smmContent: content });
    if (channels.length === 1) {
      await sendMessage(chatId,
        `✍️ *${channels[0].title}* kanaliga post:\n\n_${content}_\n\nYuborilsinmi?`,
        { inline_keyboard: [[{ text: "✅ Ha, yuborish", callback_data: `smm:publish:${channels[0].id}` }, { text: "❌ Bekor", callback_data: "smm:cancel" }]] }
      );
    } else {
      const buttons = channels.map((c) => [{ text: c.title, callback_data: `smm:publish:${c.id}` }]);
      buttons.push([{ text: "❌ Bekor", callback_data: "smm:cancel" }]);
      await sendMessage(chatId, `Qaysi kanalga yuboramiz?\n\n_${content}_`, { inline_keyboard: buttons });
    }
    return;
  }

  if (cmd.startsWith("/generate ") || cmd.startsWith("/generate\n")) {
    const topic = text.slice(10).trim();
    if (!topic) { await sendMessage(chatId, "Ishlatish: `/generate Mavzu nomi`"); return; }
    await sendChatAction(chatId);
    await sendMessage(chatId, `🤖 *${topic}* mavzusida post yaratyapman...`);
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
      const buttons = posts.map((_, i) => ({ text: `${i + 1}-ni tanlash`, callback_data: `smm:use:${i}` }));
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
    updateSession(chatId, { mode: "agent", agentId: undefined, waitingFor: undefined });
    await sendMessage(chatId, "Qaysi agent bilan ishlashni xohlaysiz?", AGENT_KEYBOARD);
    return;
  }

  if (cmd === "/chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 *Chat rejimi* faollashdi. Savol bering:");
    return;
  }

  if (cmd === "/clear") {
    clearHistory(chatId);
    await sendMessage(chatId, "✅ Suhbat tarixi tozalandi.");
    return;
  }

  if (cmd === "/status") {
    await sendMessage(chatId,
      `*Tizim holati:* ✅ Ishlayapti\n\n` +
      `*Rejim:* ${session.mode === "agent" ? `Agent (${AGENT_NAMES[session.agentId || ""] || "tanlanmagan"})` : "Chat"}\n` +
      `*Xabarlar tarixi:* ${session.history.length} ta\n` +
      `*Vaqt:* ${new Date().toLocaleString("uz-UZ")}`
    );
    return;
  }

  if (session.mode === "agent" && session.agentId) {
    await sendChatAction(chatId);
    const agentName = AGENT_NAMES[session.agentId];
    await sendMessage(chatId, `⏳ *${agentName}* ishlayapti...`);
    try {
      const result = await callAgent(session.agentId, text);
      addToHistory(chatId, "user", text);
      addToHistory(chatId, "assistant", result);
      await sendMessage(chatId,
        `*${agentName} javobi:*\n\n${cleanMarkdown(result)}`,
        {
          inline_keyboard: [
            [{ text: "🔄 Yana so'rash", callback_data: `agent:${session.agentId}` }],
            [{ text: "🤖 Boshqa agent", callback_data: "menu:agents" }, { text: "💬 Chat", callback_data: "menu:chat" }],
          ]
        }
      );
    } catch {
      await sendMessage(chatId, "❌ Agent bilan bog'lanishda xato. Qayta urinib ko'ring.");
    }
    return;
  }

  await sendChatAction(chatId);
  addToHistory(chatId, "user", text);
  try {
    const reply = await callAI(session.history);
    addToHistory(chatId, "assistant", reply);
    await sendMessage(chatId, cleanMarkdown(reply));
  } catch {
    await sendMessage(chatId, "❌ Javob olishda xato. Qayta urinib ko'ring.");
  }
}

async function handleCallback(callbackId: string, chatId: number, data: string, firstName: string) {
  await answerCallbackQuery(callbackId);

  if (data.startsWith("agent:")) {
    const agentId = data.split(":")[1];
    updateSession(chatId, { mode: "agent", agentId });
    const agentName = AGENT_NAMES[agentId];
    await sendMessage(chatId,
      `${agentName} *tanlandi!* ✅\n\n` +
      `Endi vazifangizni yozing. Men uni ${agentName} ga yuboraman.\n\n` +
      `_Masalan: "Pari AI uchun marketing strategiyasini ishlab chiq"_`
    );
    return;
  }

  if (data === "menu:chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 *Chat rejimi faollashdi.*\n\nSavol bering:");
    return;
  }

  if (data === "menu:agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "Qaysi agent bilan ishlashni xohlaysiz?", AGENT_KEYBOARD);
    return;
  }

  if (data === "menu:tasks") {
    await sendMessage(chatId, `📋 *Vazifalar*\n\nVazifalarni web ilovadan boshqaring:\n${APP_URL}/tasks`);
    return;
  }

  if (data === "menu:projects") {
    await sendMessage(chatId, `📁 *Loyihalar*\n\nLoyihalarni web ilovadan ko'ring:\n${APP_URL}/projects`);
    return;
  }

  if (data === "menu:help") { await handleMessage(chatId, "/help", firstName); return; }
  if (data === "menu:smm") { await handleMessage(chatId, "/smm", firstName); return; }

  if (data.startsWith("smm:publish:")) {
    const channelId = data.split(":")[2];
    const session = getSession(chatId);
    const content = session.smmContent;
    if (!content) { await sendMessage(chatId, "Post matni topilmadi."); return; }
    const channel = await getChannel(channelId);
    if (!channel) { await sendMessage(chatId, "Kanal topilmadi."); return; }
    const post = await createPost({ channel_id: channelId, content, status: "draft" });
    const res = await fetch(`${APP_URL}/api/smm/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    const result = await res.json();
    if (result.ok) {
      await sendMessage(chatId, `✅ *${channel.title}* kanaliga post yuborildi!`);
    } else {
      await sendMessage(chatId, `❌ Xato: ${result.error || "Noma'lum xato"}`);
    }
    updateSession(chatId, { mode: "chat", smmContent: undefined, smmChannelId: undefined });
    return;
  }

  if (data.startsWith("smm:use:")) {
    const idx = parseInt(data.split(":")[2], 10);
    const session = getSession(chatId);
    const drafts = session.smmDrafts || [];
    const content = drafts[idx];
    if (!content) { await sendMessage(chatId, "Draft topilmadi."); return; }
    const channels = await listChannels();
    if (channels.length === 0) { await sendMessage(chatId, "Kanal qo'shilmagan. /smm ni ishlatib kanal qo'shing."); return; }
    updateSession(chatId, { mode: "smm_post", smmContent: content, smmDrafts: undefined });
    if (channels.length === 1) {
      await sendMessage(chatId,
        `✍️ *${channels[0].title}* kanaliga:\n\n${content}\n\nYuborilsinmi?`,
        { inline_keyboard: [[{ text: "✅ Yuborish", callback_data: `smm:publish:${channels[0].id}` }, { text: "❌ Bekor", callback_data: "smm:cancel" }]] }
      );
    } else {
      const buttons = channels.map((c) => [{ text: c.title, callback_data: `smm:publish:${c.id}` }]);
      buttons.push([{ text: "❌ Bekor", callback_data: "smm:cancel" }]);
      await sendMessage(chatId, `Qaysi kanalga:\n\n${content}`, { inline_keyboard: buttons });
    }
    return;
  }

  if (data === "smm:create") {
    await sendMessage(chatId, `✍️ *Post yaratish*\n\nQo'lda yozing:\n/post Matn yozing\n\nYoki AI bilan yarating:\n/generate Mavzu`);
    return;
  }

  if (data === "smm:cancel") {
    updateSession(chatId, { mode: "chat", smmContent: undefined, smmChannelId: undefined, smmDrafts: undefined });
    await sendMessage(chatId, "❌ Bekor qilindi.");
    return;
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TgUpdate = await req.json();

    if (update.message?.text) {
      const { chat, text, from } = update.message;
      log("info", "telegram", `Xabar: "${text.slice(0, 60)}" from @${from.first_name}`);
      await handleMessage(chat.id, text, from.first_name);
    }

    if (update.message?.voice || update.message?.audio) {
      const { chat, from } = update.message;
      const fileId = (update.message.voice || update.message.audio)!.file_id;
      await sendChatAction(chat.id, "typing");
      try {
        const result = await transcribeVoice(fileId);
        if (result?.transcript) {
          addToHistory(chat.id, "user", result.transcript);
          addToHistory(chat.id, "assistant", result.reply);
          await sendMessage(chat.id, `_"${result.transcript}"_\n\n${cleanMarkdown(result.reply)}`);
        } else {
          await sendMessage(chat.id, "Ovozni tushunmadim, qayta yuboring.");
        }
      } catch {
        await sendMessage(chat.id, "Ovoz xabarida xato yuz berdi.");
      }
      log("info", "telegram", `Ovoz xabari from @${from.first_name}`);
    }

    if (update.callback_query) {
      const { id, message, data, from } = update.callback_query;
      await handleCallback(id, message.chat.id, data, from.first_name);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    log("error", "telegram", `Webhook xatosi: ${(e as Error).message}`);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Pari AI Telegram Bot webhook aktiv" });
}
