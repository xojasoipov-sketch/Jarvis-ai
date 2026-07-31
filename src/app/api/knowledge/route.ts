import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

// Table (run once in Supabase SQL Editor):
//   create extension if not exists vector;
//   create table pari_knowledge (
//     id bigint primary key generated always as identity,
//     title text not null,
//     content text not null,
//     tags text[] default '{}',
//     embedding vector(1536),
//     created_at timestamptz default now()
//   );
//   create index on pari_knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 10);

async function getEmbedding(text: string): Promise<number[] | null> {
  const key =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY2 ||
    "";
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

// GET /api/knowledge — list all or semantic search
// ?q=query → semantic (pgvector) search if embedding available, else text search
export async function GET(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ items: [], configured: false });
  const q = new URL(req.url).searchParams.get("q");

  if (q) {
    // Try semantic search first
    const embedding = await getEmbedding(q);
    if (embedding) {
      const { data, error } = await supabase!.rpc("pari_semantic_search", {
        query_embedding: embedding,
        match_count: 10,
      });
      if (!error && data?.length) {
        return NextResponse.json({ items: data, semantic: true, configured: true });
      }
    }
    // Fallback: text search
    const { data, error } = await supabase!
      .from("pari_knowledge")
      .select("id, title, content, tags, created_at")
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return NextResponse.json({ error: error.message, items: [] });
    return NextResponse.json({ items: data, semantic: false, configured: true });
  }

  const { data, error } = await supabase!
    .from("pari_knowledge")
    .select("id, title, content, tags, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message, items: [] });
  return NextResponse.json({ items: data ?? [], configured: true });
}

// POST /api/knowledge — create new knowledge item
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { title, content, tags = [] } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "title va content kerak" }, { status: 400 });

  const embedding = await getEmbedding(`${title}\n${content}`);
  const { data, error } = await supabase!
    .from("pari_knowledge")
    .insert({ title, content, tags, ...(embedding ? { embedding } : {}) })
    .select("id, title, content, tags, created_at")
    .single();
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "pari_knowledge jadvali topilmadi — yuqoridagi SQL bilan yarating"
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

// DELETE /api/knowledge?id=123
export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { error } = await supabase!.from("pari_knowledge").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
