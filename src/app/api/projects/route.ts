import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET() {
  if (!dbConfigured) return NextResponse.json({ projects: [], configured: false });
  const { data, error } = await supabase!.from("pari_projects").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message, projects: [] }, { status: 500 });
  return NextResponse.json({ projects: data, configured: true });
}

export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { name, status = "planning", progress = 0 } = await req.json();
  if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });
  const { data, error } = await supabase!.from("pari_projects").insert({ name, status, progress }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function PATCH(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { data, error } = await supabase!.from("pari_projects").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Baza sozlanmagan" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const { error } = await supabase!.from("pari_projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
