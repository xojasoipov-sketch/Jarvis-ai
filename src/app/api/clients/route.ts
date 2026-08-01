import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET() {
  if (!dbConfigured || !supabase) return NextResponse.json({ clients: [] });
  const { data } = await supabase
    .from("pari_clients")
    .select("*")
    .order("created_at", { ascending: false });
  return NextResponse.json({ clients: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Ism majburiy" }, { status: 400 });
  if (!dbConfigured || !supabase) return NextResponse.json({ error: "DB sozlanmagan" }, { status: 500 });
  const { data, error } = await supabase
    .from("pari_clients")
    .insert({ name: body.name, email: body.email, phone: body.phone, company: body.company, website: body.website, notes: body.notes })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}
