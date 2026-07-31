import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

// Table: pari_conversations (id text pk, title text, messages jsonb, updated_at timestamptz)
// Create once in Supabase SQL editor:
//   create table pari_conversations (
//     id text primary key,
//     title text not null,
//     messages jsonb not null default '[]',
//     updated_at timestamptz not null default now()
//   );

type Message = { role: "user" | "assistant"; content: string; ts: number };

function makeTitle(msg: string): string {
  const clean = msg.replace(/\n+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "..." : clean;
}

// GET /api/conversations — list all
// GET /api/conversations?id=xxx — get one
export async function GET(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ conversations: [], configured: false });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase!.from("pari_conversations").select("*").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ id: data.id, title: data.title, messages: data.messages });
  }

  const { data, error } = await supabase!
    .from("pari_conversations")
    .select("id, title, updated_at, messages")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ conversations: [], configured: true, error: error.message }, { status: 200 });
  }
  const list = (data || []).map((c) => ({
    id: c.id, title: c.title, updatedAt: new Date(c.updated_at).getTime(), count: (c.messages || []).length,
  }));
  return NextResponse.json({ conversations: list, configured: true });
}

// POST /api/conversations — save/update a conversation
// body: { id?, messages, title? }
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { id, messages, title } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

  const stamped = messages.map((m: Message) => ({ ...m, ts: m.ts || Date.now() }));

  if (id) {
    const { error } = await supabase!
      .from("pari_conversations")
      .update({ messages: stamped, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id });
  }

  const convId = `conv_${Date.now()}`;
  const firstUser = (messages as Message[]).find((m) => m.role === "user");
  const convTitle = title || (firstUser ? makeTitle(firstUser.content) : "New conversation");
  const { error } = await supabase!
    .from("pari_conversations")
    .insert({ id: convId, title: convTitle, messages: stamped });
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "pari_conversations jadvali topilmadi — Supabase SQL Editor'da yarating (kod ichidagi izohga qarang)"
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ id: convId, title: convTitle });
}

// DELETE /api/conversations?id=xxx
export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase!.from("pari_conversations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
