/**
 * POST /api/telegram/notify
 * Portfolio zakazlarini admin ga yuboradi
 * Auth: kerak emas (public — faqat portfolio dan chaqiriladi)
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, parse_mode = "Markdown" } = await req.json().catch(() => ({})) as {
    text?: string;
    parse_mode?: string;
  };

  if (!text) return NextResponse.json({ error: "text kerak" }, { status: 400 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Graceful — admin ga yetmasa ham foydalanuvchiga xato ko'rsatmaymiz
    console.warn("[notify] TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_ID yo'q");
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode }),
    });
    const data = await res.json() as { ok: boolean };
    return NextResponse.json({ ok: data.ok, delivered: data.ok });
  } catch (e) {
    console.error("[notify] Telegram xato:", e);
    return NextResponse.json({ ok: true, delivered: false });
  }
}
