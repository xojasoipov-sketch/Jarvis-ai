import { NextRequest, NextResponse } from "next/server";

// In-memory conversation store (persists per process/deployment)
// In production this should be PostgreSQL or Redis
type Message = { role: "user" | "assistant"; content: string; ts: number };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };

const store = new Map<string, Conversation>();

// Auto-generate a title from the first user message
function makeTitle(msg: string): string {
  const clean = msg.replace(/\n+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "..." : clean;
}

// GET /api/conversations — list all
// GET /api/conversations?id=xxx — get one
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const conv = store.get(id);
    if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(conv);
  }

  const list = Array.from(store.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, title, updatedAt, messages }) => ({
      id, title, updatedAt, count: messages.length,
    }));
  return NextResponse.json({ conversations: list });
}

// POST /api/conversations — save/update a conversation
// body: { id?, messages, title? }
export async function POST(req: NextRequest) {
  const { id, messages, title } = await req.json();

  if (!messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const convId = id || `conv_${Date.now()}`;
  const firstUser = messages.find((m: Message) => m.role === "user");
  const convTitle = title || (firstUser ? makeTitle(firstUser.content) : "New conversation");

  const existing = store.get(convId);
  const conv: Conversation = {
    id: convId,
    title: existing?.title || convTitle,
    messages: messages.map((m: Message) => ({ ...m, ts: m.ts || Date.now() })),
    updatedAt: Date.now(),
  };
  store.set(convId, conv);

  // Keep only last 50 conversations
  if (store.size > 50) {
    const oldest = Array.from(store.values())
      .sort((a, b) => a.updatedAt - b.updatedAt)[0];
    store.delete(oldest.id);
  }

  return NextResponse.json({ id: convId, title: conv.title });
}

// DELETE /api/conversations?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  store.delete(id);
  return NextResponse.json({ deleted: true });
}
