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
  caption?: string;
  voice?: { file_id: string; duration: number; mime_type?: string };
  audio?: { file_id: string; mime_type?: string };
  photo?: { file_id: string; width: number; height: number; file_size?: number }[];
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  date: number;
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
  url?: string;
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
  const api = getApi();
  const res = await fetch(`${api}/getFile?file_id=${fileId}`);
  if (!res.ok) return null;
  const data = await res.json();
  const path = data?.result?.file_path;
  if (!path) return null;
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  return `https://api.telegram.org/file/bot${token}/${path}`;
}

export async function downloadVoice(fileId: string): Promise<Blob | null> {
  const url = await getFileUrl(fileId);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.blob();
}

export function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "```\n$1\n```")
    .replace(/#{1,3} (.+)/g, "*$1*")
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    .slice(0, 4096);
}

export async function sendDocument(chatId: number, fileUrl: string, filename: string, caption?: string) {
  const body: Record<string, unknown> = { chat_id: chatId, document: fileUrl };
  if (caption) body.caption = caption;
  await fetch(`${getApi()}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendPhoto(chatId: number, photoUrl: string, caption?: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl };
  if (caption) body.caption = caption;
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`${getApi()}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function editMessageText(chatId: number, messageId: number, text: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`${getApi()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
      { text: "🔒 Security", callback_data: "agent:security" },
    ],
    [
      { text: "🏗️ Architect", callback_data: "agent:architect" },
      { text: "🐛 Debug", callback_data: "agent:debug" },
      { text: "💰 Finance", callback_data: "agent:finance" },
    ],
  ],
};
