// GET /api/cameras/gateway — ro'yxatdan o'tgan gateway'lar (Settings → Gateway UI uchun)
import { NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET() {
  if (!dbConfigured || !supabase) return NextResponse.json({ ok: false, gateways: [] });
  const { data } = await supabase
    .from("camera_gateways")
    .select("id, name, status, last_seen, revoked_at, revoked_reason, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ ok: true, gateways: data || [] });
}
