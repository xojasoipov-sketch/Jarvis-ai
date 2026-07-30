import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET() {
  if (!dbConfigured) return NextResponse.json({ tasks: [], configured: false });
  const { data, error } = await supabase!.from("pari_tasks").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 });
  return NextResponse.json({ tasks: data, configured: true });
}

export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const body = await req.json();
  const { title, description = "", priority = "medium", agent } = body;
  if (!title) return NextResponse.json({ error: "title kerak" }, { status: 400 });
  const { data, error } = await supabase!.from("pari_tasks").insert({ title, description, priority, agent }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function PATCH(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { data, error } = await supabase!.from("pari_tasks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { error } = await supabase!.from("pari_tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
