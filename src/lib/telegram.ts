const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

export type TgMessage = {
  message_id: number;
  from: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
};

export type TgCallbackQuery = {
  id: string;
  from: { id: number; first_name: string };
  message: TgMessage;
  data: string;
};

export type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };

export async function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) body.reply_markup = keyboard;

  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendChatAction(chatId: number, action = "typing") {
  await fetch(`${API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

export async function answerCallbackQuery(callbackId: string, text?: string) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

export async function setWebhook(url: string) {
  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"] }),
  });
  return res.json();
}

export async function deleteWebhook() {
  const res = await fetch(`${API}/deleteWebhook`, { method: "POST" });
  return res.json();
}

export async function getWebhookInfo() {
  const res = await fetch(`${API}/getWebhookInfo`);
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API}/getMe`);
  return res.json();
}

// Markdown ni Telegram uchun tozalash
export function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "```\n$1\n```")
    .replace(/#{1,3} (.+)/g, "*$1*")
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    .slice(0, 4096);
}

export const AGENT_KEYBOARD: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: "👔 CEO", callback_data: "agent:ceo" },
      { text: "🔬 Research", callback_data: "agent:researcher" },
      { text: "💻 Coder", callback_data: "agent:coder" },
    ],
    [
      { text: "📊 Analyst", callback_data: "agent:analyst" },
      { text: "✍️ Writer", callback_data: "agent:writer" },
      { text: "📣 Marketing", callback_data: "agent:marketing" },
    ],
    [
      { text: "⚙️ DevOps", callback_data: "agent:devops" },
      { text: "🎯 Assistant", callback_data: "agent:assistant" },
    ],
  ],
};

export const MAIN_KEYBOARD: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: "💬 Chat", callback_data: "menu:chat" },
      { text: "🤖 Agentlar", callback_data: "menu:agents" },
    ],
    [
      { text: "📋 Vazifalar", callback_data: "menu:tasks" },
      { text: "📁 Loyihalar", callback_data: "menu:projects" },
    ],
    [{ text: "ℹ️ Yordam", callback_data: "menu:help" }],
  ],
};
