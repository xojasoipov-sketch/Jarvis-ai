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

async function handleMessage(chatId: number, text: string, firstName: string, isOwner: boolean) {
  const session = getSession(chatId);
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start") {
    clearHistory(chatId);
    updateSession(chatId, { mode: "chat", agentId: undefined });
    const ownerHello =
      `Salom, *${OWNER.shortName}*! 👑\n\n` +
      `Men *Pari AI* — siz yaratgan shaxsiy tizimman.\n` +
      `Siz egasi va yaratuvchisisiz (@${OWNER.username}, id \`${OWNER.telegramId}\`).\n\n` +
      `Buyruq bering — chat, agent, SMM, vazifa.`;
    const guestHello =
      `Salom, *${firstName}*!\n\n` +
      `Bu bot *Pari AI* — shaxsiy tizim. Yaratuvchi: *${OWNER.displayName}* (@${OWNER.username}).\n` +
      `Mehmonlar uchun limit: *10 so'rov / 24 soat*.`;
    await sendMessage(chatId, isOwner ? ownerHello : guestHello, isOwner ? MAIN_KEYBOARD : undefined);
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
      `*Pari AI* — yaratuvchi: *${OWNER.displayName}* (@${OWNER.username})\n\n` +
      `/start — Bosh menyu\n/agents — Agent\n/chat — Chat\n/smm — SMM\n/clear — Tozalash\n/status — Holat`
    );
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
      `*Tizim:* ✅\n*Siz:* ${isOwner ? "👑 Egasi" : "Mehmon"}\n` +
      `*Rejim:* ${session.mode}\n*Tarix:* ${session.history.length}`
    );
    return;
  }

  if (cmd === "/smm") {
    if (!isOwner) {
      await sendMessage(chatId, "SMM faqat egasi uchun.");
      return;
    }
    const channels = await listChannels();
    await sendMessage(chatId,
      channels.length
        ? `📊 *SMM* — ${channels.length} kanal`
        : "📊 *SMM* — kanal yo'q. Web ilovadan qo'shing.",
      { inline_keyboard: [[{ text: "⚙️ SMM", web_app: { url: `${APP_URL}/smm` } }]] }
    );
    return;
  }

  if (session.mode === "agent" && session.agentId) {
    await sendChatAction(chatId);
    const agentName = AGENT_NAMES[session.agentId] || session.agentId;
    await sendMessage(chatId, `⏳ *${agentName}* ishlayapti...`);
    try {
      const taskForAgent = isOwner
        ? `[Egasi ${OWNER.shortName} buyrug'i — aniq bajar, chalkashtirma]\n${text}`
        : text;
      const result = await callAgent(session.agentId, taskForAgent);
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
    const sys = ownerChatSystem() + (isOwner
      ? "\nHozir yozayotgan shaxs — EGASI. To'liq ishonch."
      : "\nHozirgi foydalanuvchi — mehmon. Qisqa yordam.");
    const reply = await callAI(session.history, sys);
    addToHistory(chatId, "assistant", reply);
    await sendMessage(chatId, cleanMarkdown(reply));
  } catch {
    await sendMessage(chatId, "❌ Javob olishda xato.");
  }
}

async function handleCallback(callbackId: string, chatId: number, data: string, firstName: string, isOwner = false) {
  await answerCallbackQuery(callbackId);

  if (data.startsWith("agent:")) {
    const agentId = data.split(":")[1];
    updateSession(chatId, { mode: "agent", agentId });
    await sendMessage(chatId, `${AGENT_NAMES[agentId] || agentId} *tanlandi!* Vazifangizni yozing.`);
    return;
  }
  if (data === "menu:chat") {
    updateSession(chatId, { mode: "chat", agentId: undefined });
    await sendMessage(chatId, "💬 Chat rejimi. Savol bering:");
    return;
  }
  if (data === "menu:agents") {
    updateSession(chatId, { mode: "agent", agentId: undefined });
    await sendMessage(chatId, "Qaysi agent?", AGENT_KEYBOARD);
    return;
  }
  if (data === "menu:tasks") {
    await sendMessage(chatId, `📋 Vazifalar: ${APP_URL}/tasks`);
    return;
  }
  if (data === "menu:smm") {
    await handleMessage(chatId, "/smm", firstName, isOwner);
    return;
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TgUpdate = await req.json();

    if (update.message?.text) {
      const { chat, text, from } = update.message;
      const owner = isOwnerTelegram(from);
      log("info", "telegram", `Xabar from ${from?.username || from?.id} owner=${owner}`);
      if (!owner) {
        const lim = checkGuestTelegramLimit(from.id);
        if (!lim.allowed) {
          await sendMessage(chat.id,
            `⛔ Limit tugadi (${lim.limit}/24s).\nYaratuvchi: *${OWNER.displayName}* (@${OWNER.username}).`
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
          await sendMessage(chat.id, `⛔ Limit. Yaratuvchi: @${OWNER.username}`);
          return NextResponse.json({ ok: true });
        }
        consumeGuestTelegram(from.id);
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
    owner: { id: OWNER.telegramId, username: OWNER.username, name: OWNER.displayName },
    guest_limit: 10,
  });
}
