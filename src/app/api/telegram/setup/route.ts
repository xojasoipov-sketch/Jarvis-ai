import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pari-ai-production.up.railway.app";

function api(path: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var topilmadi");
  return `https://api.telegram.org/bot${token}/${path}`;
}

async function tgPost(path: string, body?: object) {
  const res = await fetch(api(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function tgGet(path: string) {
  const res = await fetch(api(path));
  return res.json();
}

export async function POST(req: NextRequest) {
  const { action, appUrl } = await req.json();
  const baseUrl = appUrl || APP_URL;

  // Token mavjudligini tekshir
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({
      error: "TELEGRAM_BOT_TOKEN Railway Variables'da topilmadi. railway.app/project → Variables'ga qo'shing.",
      tokenMissing: true,
    }, { status: 200 });
  }

  try {
    if (action === "set") {
      const webhookUrl = `${baseUrl}/api/telegram`;
      const [webhookRes, botInfo, menuRes] = await Promise.all([
        tgPost("setWebhook", {
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true,
        }),
        tgGet("getMe"),
        // Mini App menu tugmasi
        tgPost("setChatMenuButton", {
          menu_button: {
            type: "web_app",
            text: "🚀 Pari AI",
            web_app: { url: baseUrl },
          },
        }),
      ]);

      // Bot commandlarini ham o'rnatish
      await tgPost("setMyCommands", {
        commands: [
          { command: "start", description: "Botni ishga tushirish" },
          { command: "agents", description: "Agent tanlash" },
          { command: "chat", description: "Chat rejimi" },
          { command: "app", description: "Pari AI ilovasini ochish" },
          { command: "clear", description: "Suhbatni tozalash" },
          { command: "status", description: "Tizim holati" },
          { command: "help", description: "Yordam" },
        ],
      });

      return NextResponse.json({ webhook: webhookRes, bot: botInfo, menu: menuRes });
    }

    if (action === "delete") {
      const [res, menuRes] = await Promise.all([
        tgPost("deleteWebhook"),
        tgPost("setChatMenuButton", { menu_button: { type: "default" } }),
      ]);
      return NextResponse.json({ webhook: res, menu: menuRes });
    }

    if (action === "info") {
      const [info, botInfo] = await Promise.all([tgGet("getWebhookInfo"), tgGet("getMe")]);
      return NextResponse.json({ webhook: info, bot: botInfo, tokenPresent: true });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 200 });
  }

  return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
}
