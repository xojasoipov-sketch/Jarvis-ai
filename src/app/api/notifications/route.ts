import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

// Table (added to 002 migration):
//   create table pari_notifications (
//     id bigint primary key generated always as identity,
//     title text not null,
//     body text,
//     type text not null default 'info',   -- info | success | warning | error
//     read boolean not null default false,
//     created_at timestamptz default now()
//   );

// GET /api/notifications — list unread (or all with ?all=1)
export async function GET(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ notifications: [], configured: false });
  const all = new URL(req.url).searchParams.get("all");
  const q = supabase!.from("pari_notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (!all) q.eq("read", false);
  const { data, error } = await q;
  if (error) return NextResponse.json({ notifications: [], error: error.message });
  return NextResponse.json({ notifications: data ?? [], configured: true });
}

// POST /api/notifications — create notification
export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Supabase sozlanmagan" }, { status: 503 });
  const { title, body, type = "info" } = await req.json();
  if (!title) return NextResponse.json({ error: "title kerak" }, { status: 400 });
  const { data, error } = await supabase!
    .from("pari_notifications")
    .insert({ title, body, type })
    .select()
    .single();
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "pari_notifications jadvali topilmadi — 002 migration'ni qayta ishga tushiring"
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ notification: data });
}

// PATCH /api/notifications — mark as read (body: { id } or { all: true })
export async function PATCH(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Supabase sozlanmagan" }, { status: 503 });
  const { id, all } = await req.json();
  if (all) {
    await supabase!.from("pari_notifications").update({ read: true }).eq("read", false);
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await supabase!.from("pari_notifications").update({ read: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications?id=123
export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Supabase sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await supabase!.from("pari_notifications").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
