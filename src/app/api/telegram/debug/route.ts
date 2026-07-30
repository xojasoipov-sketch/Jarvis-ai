import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      ok: false,
      error: "TELEGRAM_BOT_TOKEN topilmadi",
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("TELEGRAM") || k.includes("telegram")),
    });
  }

  // Token bilan Telegram ga to'g'ridan-to'g'ri so'rov
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    return NextResponse.json({
      ok: data.ok,
      tokenLength: token.length,
      tokenPrefix: token.slice(0, 10) + "...",
      telegram: data,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
