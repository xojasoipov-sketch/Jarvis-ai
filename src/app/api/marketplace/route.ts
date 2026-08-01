import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const q = req.nextUrl.searchParams.get("q");

  if (!dbConfigured || !supabase) return NextResponse.json({ items: [] });

  let query = supabase.from("pari_marketplace_items").select("*").eq("active", true).order("created_at", { ascending: false });
  if (category && category !== "all") query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data } = await query;
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim() || !body.description?.trim() || !body.category) {
    return NextResponse.json({ error: "title, description, category majburiy" }, { status: 400 });
  }
  if (!dbConfigured || !supabase) return NextResponse.json({ error: "DB sozlanmagan" }, { status: 500 });

  const { data, error } = await supabase
    .from("pari_marketplace_items")
    .insert({
      title: body.title,
      description: body.description,
      category: body.category,
      price: body.price || 0,
      price_display: body.price_display || (body.price ? `$${body.price}` : "Bepul"),
      price_free: body.price_free || false,
      seller_name: body.seller_name || "Sadi",
      demo_url: body.demo_url || null,
      tags: body.tags || [],
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
