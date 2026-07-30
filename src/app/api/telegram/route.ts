import { NextRequest, NextResponse } from "next/server";
import {
  TgUpdate, sendMessage, sendChatAction, answerCallbackQuery,
  cleanMarkdown, AGENT_KEYBOARD,
} from "@/lib/telegram";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pari-ai-production.up.railway.app";

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "💬 Chat", callback_data: "menu:chat" },
      { text: "🤖 Agentlar", callback_data: "menu:agents" },
    ],
    [
      { text: "📋 Vazifalar", callback_data: "menu:tasks" },
      { text: "📁 Loyihalar", callback_data: "menu:projects" },
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

async function callAI(messages: Array<{ role: string; content: string }>, system?: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pari-ai-production.up.railway.app";
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });
  if (!res.ok) return "Kechirasiz, xato yuz berdi.";
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value);
  }
  return text.trim() || "Javob bo'sh qaytdi.";
}

async function callAgent(agentId: string, task: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pari-ai-production.up.railway.app";
  const res = await fetch(`${baseUrl}/api/agent`, {
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

  // Buyruqlar
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
      `/clear — Suhbatni tozalash\n` +
      `/status — Tizim holati\n\n` +
      `*Agentlar:*\n` +
      Object.entries(AGENT_NAMES).map(([, v]) => `• ${v}`).join("\n")
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
      `*Tizim holati:* ✅ Ishlayapti\n\n` +
      `*Rejim:* ${session.mode === "agent" ? `Agent (${AGENT_NAMES[session.agentId || ""] || "tanlanmagan"})` : "Chat"}\n` +
      `*Xabarlar tarixi:* ${session.history.length} ta\n` +
      `*Vaqt:* ${new Date().toLocaleString("uz-UZ")}`
    );
    return;
  }

  // Agent rejimida vazifa
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

  // Chat rejimi
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
    await sendMessage(chatId,
      `📋 *Vazifalar*\n\nVazifalarni web ilovadan boshqaring:\nhttps://pari-ai-production.up.railway.app/tasks`
    );
    return;
  }

  if (data === "menu:projects") {
    await sendMessage(chatId,
      `📁 *Loyihalar*\n\nLoyihalarni web ilovadan ko'ring:\nhttps://pari-ai-production.up.railway.app/projects`
    );
    return;
  }

  if (data === "menu:help") {
    await handleMessage(chatId, "/help", firstName);
    return;
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TgUpdate = await req.json();

    if (update.message?.text) {
      const { chat, text, from } = update.message;
      log("info", "telegram", `Xabar qabul qilindi: "${text.slice(0, 60)}" from @${from.first_name}`);
      await handleMessage(chat.id, text, from.first_name);
    }

    if (update.callback_query) {
      const { id, message, data, from } = update.callback_query;
      await handleCallback(id, message.chat.id, data, from.first_name);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    log("error", "telegram", `Webhook xatosi: ${(e as Error).message}`);
    return NextResponse.json({ ok: false }, { status: 200 }); // Telegram 200 talab qiladi
  }
}

export async function GET() {
  return NextResponse.json({ status: "Pari AI Telegram Bot webhook aktiv" });
}
