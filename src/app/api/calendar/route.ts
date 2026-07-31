import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

// Table: pari_events (id bigint pk, title text, time text, type text, day int, created_at timestamptz)
// Create once in Supabase SQL editor:
//   create table pari_events (
//     id bigint generated always as identity primary key,
//     title text not null,
//     time text not null,
//     type text not null default 'task',
//     day int not null,
//     created_at timestamptz not null default now()
//   );

export async function GET() {
  if (!dbConfigured) return NextResponse.json({ events: [], configured: false });
  const { data, error } = await supabase!.from("pari_events").select("*").order("day", { ascending: true });
  if (error) return NextResponse.json({ events: [], configured: true, error: error.message }, { status: 200 });
  return NextResponse.json({ events: data, configured: true });
}

export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { title, time, type, day } = await req.json();
  if (!title || !day) return NextResponse.json({ error: "title va day kerak" }, { status: 400 });
  const { data, error } = await supabase!.from("pari_events").insert({ title, time, type, day }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { error } = await supabase!.from("pari_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
