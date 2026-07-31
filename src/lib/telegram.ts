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
  voice?: { file_id: string; duration: number; mime_type?: string };
  audio?: { file_id: string; duration: number; mime_type?: string };
};

export type TgCallbackQuery = {
  id: string;
  from: { id: number; first_name: string };
  message: TgMessage;
  data: string;
};

export type InlineButton = {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
};

export type InlineKeyboard = {
  inline_keyboard: InlineButton[][];
};

// Token har safar runtime'da o'qiladi (build vaqtida emas)
function getApi() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN topilmadi");
  return `https://api.telegram.org/bot${token}`;
}

export async function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) body.reply_markup = keyboard;

  await fetch(`${getApi()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendChatAction(chatId: number, action = "typing") {
  await fetch(`${getApi()}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

export async function answerCallbackQuery(callbackId: string, text?: string) {
  await fetch(`${getApi()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

export async function setWebhook(url: string) {
  const res = await fetch(`${getApi()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"], drop_pending_updates: true }),
  });
  return res.json();
}

export async function getWebhookInfo() {
  const res = await fetch(`${getApi()}/getWebhookInfo`);
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${getApi()}/getMe`);
  return res.json();
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${getApi()}/getFile?file_id=${fileId}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  const path = data?.result?.file_path;
  if (!path) return null;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return `https://api.telegram.org/file/bot${token}/${path}`;
}

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
