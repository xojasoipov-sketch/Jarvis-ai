import { NextRequest, NextResponse } from "next/server";
import { listChannels, addChannel, deleteChannel } from "@/lib/smm-store";

// GET /api/smm/channels
export async function GET() {
  const channels = await listChannels();
  return NextResponse.json({ channels });
}

// POST /api/smm/channels  { chat_id, username, title, category }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { chat_id, username, title, category = "general" } = body;
  if (!chat_id || !title) {
    return NextResponse.json({ error: "chat_id va title kerak" }, { status: 400 });
  }

  // Verify bot has access to channel (only if token is configured)
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: Number(chat_id),
          text: `✅ *Pari AI* ushbu kanal bilan ulandi. Endi post joylashim mumkin!`,
          parse_mode: "Markdown",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json({
          error: `Kanalga xabar yubora olmadim: ${data.description || "noma'lum xato"}. Bot kanal admin ekanligini tekshiring.`,
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Telegram API bilan bog'lanishda xato." }, { status: 400 });
    }
  }

  const channel = await addChannel({ chat_id: Number(chat_id), username: username || "", title, category });
  return NextResponse.json({ channel });
}

// DELETE /api/smm/channels?id=...
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteChannel(id);
  return NextResponse.json({ ok: true });
}
