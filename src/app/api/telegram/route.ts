import { NextRequest, NextResponse } from "next/server";
import {
  TgUpdate, sendMessage, sendChatAction, answerCallbackQuery,
  cleanMarkdown, AGENT_KEYBOARD, downloadVoice, getFileUrl,
} from "@/lib/telegram";
import { listChannels, createPost, listPosts, getChannel } from "@/lib/smm-store";
import { getSession, updateSession, addToHistory, clearHistory } from "@/lib/session-store";
import { log } from "@/lib/logger";
import {
  OWNER,
  isOwnerTelegram,
  checkGuestTelegramLimit,
  consumeGuestTelegram,
  ownerChatSystem,
} from "@/lib/owner";
import { guestStartText, portfolioTelegramSummary, SADIPRIME } from "@/lib/sadiprime";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pari-ai-ten.vercel.app");

const PORTFOLIO_URL = `${APP_URL}/portfolio`;

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

/** Mehmonlar — faqat SADIPRIME portfolio */
const GUEST_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🏢 SADIPRIME Portfolio", web_app: { url: PORTFOLIO_URL } }],
    [
      { text: "📋 Loyihalar", callback_data: "guest:projects" },
      { text: "⚙️ Xizmatlar", callback_data: "guest:services" },
    ],
    [{ text: "✉️ Bog'lanish", url: `https://t.me/${SADIPRIME.telegram}` }],
  ],
};

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

async function handleGuestMessage(chatId: number, text: string, firstName: string) {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start" || cmd === "/portfolio" || cmd === "/help" || cmd === "/yordam") {
    await sendMessage(chatId, guestStartText(firstName), GUEST_KEYBOARD);
    return;
  }

  if (cmd === "/loyihalar" || cmd.includes("loyiha") || cmd.includes("portfolio")) {
    await sendMessage(chatId, portfolioTelegramSummary(), GUEST_KEYBOARD);
    return;
  }

  // Qisqa savollarga portfolio kontekstida javob
  await sendChatAction(chatId);
  const sys =
    `Sen ${SADIPRIME.brand} studiyasining qisqa yordamchisisan. ` +
    `Faqat studio xizmatlari, loyihalar va bog'lanish haqida gapir. ` +
    `Pari AI shaxsiy tizimini ochma. Email: ${SADIPRIME.email}. TG: @${SADIPRIME.telegram}. ` +
    `Javob o'zbekcha, qisqa.`;
  const reply = await callAI([{ role: "user", content: text }], sys);
  await sendMessage(chatId, cleanMarkdown(reply), GUEST_KEYBOARD);
}

async function handleMessage(chatId: number, text: string, firstName: string, isOwner: boolean) {
  if (!isOwner) {
    await handleGuestMessage(chatId, text, firstName);
    return;
  }

  const session = getSession(chatId);
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start") {
    clearHistory(chatId);
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(
      chatId,
      `Salom, *${OWNER.shortName}*! 👑\n\n` +
        `Men *Pari AI* — siz yaratgan shaxsiy tizimman.\n` +
        `Siz egasi (@${OWNER.username}).\n\nBuyruq bering.`,
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

  if (cmd === "/help" || cmd === "/yordam") {
    await sendMessage(
      chatId,
      `*Pari AI* — egasi: @${OWNER.username}\n/start /agents /chat /smm /portfolio /clear /status`
    );
    return;
  }

  if (cmd === "/agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "Qaysi agent?", AGENT_KEYBOARD);
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
    await sendMessage(chatId, `✅ Egasi | rejim: ${session.mode} | tarix: ${session.history.length}`);
    return;
  }

  if (cmd === "/smm") {
    const channels = await listChannels();
    await sendMessage(
      chatId,
      channels.length ? `📊 SMM — ${channels.length} kanal` : "📊 SMM — kanal yo'q",
      { inline_keyboard: [[{ text: "SMM", web_app: { url: `${APP_URL}/smm` } }]] }
    );
    return;
  }

  if (session.mode === "agent" && session.agentId) {
    await sendChatAction(chatId);
    const agentName = AGENT_NAMES[session.agentId] || session.agentId;
    await sendMessage(chatId, `⏳ *${agentName}*...`);
    try {
      const result = await callAgent(
        session.agentId,
        `[Egasi ${OWNER.shortName}]\n${text}`
      );
      addToHistory(chatId, "user", text);
      addToHistory(chatId, "assistant", result);
      await sendMessage(chatId, `*${agentName}:*\n\n${cleanMarkdown(result)}`, {
        inline_keyboard: [
          [{ text: "🔄 Yana", callback_data: `agent:${session.agentId}` }],
          [{ text: "🤖 Agentlar", callback_data: "menu:agents" }, { text: "💬 Chat", callback_data: "menu:chat" }],
        ],
      });
    } catch {
      await sendMessage(chatId, "❌ Agent xato.");
    }
    return;
  }

  await sendChatAction(chatId);
  addToHistory(chatId, "user", text);
  try {
    const reply = await callAI(
      session.history,
      ownerChatSystem() + "\nHozir — EGASI."
    );
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
    await sendMessage(chatId, guestStartText(firstName), GUEST_KEYBOARD);
    return;
  }

  if (data.startsWith("agent:")) {
    const agentId = data.split(":")[1];
    updateSession(chatId, { mode: "agent", agentId });
    await sendMessage(chatId, `${AGENT_NAMES[agentId] || agentId} tanlandi. Vazifa yozing.`);
    return;
  }
  if (data === "menu:chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 Chat.");
    return;
  }
  if (data === "menu:agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "Agent tanlang:", AGENT_KEYBOARD);
    return;
  }
  if (data === "menu:tasks") {
    await sendMessage(chatId, `📋 ${APP_URL}/tasks`);
    return;
  }
  if (data === "menu:smm") {
    await handleMessage(chatId, "/smm", firstName, true);
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
        const lim = checkGuestTelegramLimit(from.id);
        if (!lim.allowed) {
          await sendMessage(
            chat.id,
            `⛔ Limit (${lim.limit}/24s).\n*${SADIPRIME.brand}* — @${SADIPRIME.telegram}\nPortfolio: ${PORTFOLIO_URL}`
          );
          return NextResponse.json({ ok: true });
        }
        consumeGuestTelegram(from.id);
      }
      await handleMessage(chat.id, text, from.first_name, owner);
    }

    if (update.message?.voice || update.message?.audio) {
      const { chat, from } = update.message;
      const owner = isOwnerTelegram(from);
      if (!owner) {
        const lim = checkGuestTelegramLimit(from.id);
        if (!lim.allowed) {
          await sendMessage(chat.id, `⛔ Limit. @${SADIPRIME.telegram}`);
          return NextResponse.json({ ok: true });
        }
        consumeGuestTelegram(from.id);
        await sendMessage(chat.id, guestStartText(from.first_name), GUEST_KEYBOARD);
        return NextResponse.json({ ok: true });
      }
      const fileId = (update.message.voice || update.message.audio)!.file_id;
      await sendChatAction(chat.id, "typing");
      try {
        const result = await transcribeVoice(fileId);
        if (result?.transcript) {
          addToHistory(chat.id, "user", result.transcript);
          addToHistory(chat.id, "assistant", result.reply);
          await sendMessage(chat.id, `_"${result.transcript}"_\n\n${cleanMarkdown(result.reply)}`);
        } else {
          await sendMessage(chat.id, "Ovozni tushunmadim.");
        }
      } catch {
        await sendMessage(chat.id, "Ovoz xatosi.");
      }
    }

    if (update.callback_query) {
      const { id, message, data, from } = update.callback_query;
      await handleCallback(id, message.chat.id, data, from.first_name, isOwnerTelegram(from));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    log("error", "telegram", String(e));
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    owner: OWNER.username,
    portfolio: PORTFOLIO_URL,
    brand: SADIPRIME.brand,
  });
}
