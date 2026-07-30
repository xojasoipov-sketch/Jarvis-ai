import { NextRequest, NextResponse } from "next/server";
import { listChannels, addChannel, deleteChannel } from "@/lib/smm-store";
import { sendMessage } from "@/lib/telegram";

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

  // Verify bot has access to channel
  try {
    await sendMessage(chat_id, `✅ *Pari AI* ushbu kanal bilan ulandi.\n\nEndi post joylashim mumkin!`);
  } catch {
    return NextResponse.json({ error: "Kanalga xabar yubora olmadim. Bot admin ekanligini tekshiring." }, { status: 400 });
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
