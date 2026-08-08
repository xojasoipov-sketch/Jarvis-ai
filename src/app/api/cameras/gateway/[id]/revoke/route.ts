// POST /api/cameras/gateway/:id/revoke — gateway'ni bekor qilish (Settings → Gateway → Security → Revoke Device)
// Revoke qilingandan keyin gateway-auth.ts har bir signed so'rovda revoked_at'ni tekshiradi va rad etadi.
import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured || !supabase) return NextResponse.json({ ok: false, error: "Supabase sozlanmagan" }, { status: 500 });
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { reason?: string };

  const { data: gateway } = await supabase.from("camera_gateways").select("id").eq("id", id).single();
  if (!gateway) return NextResponse.json({ ok: false, error: "Gateway topilmadi" }, { status: 404 });

  await supabase.from("camera_gateways").update({
    revoked_at: new Date().toISOString(),
    revoked_reason: body.reason || "Foydalanuvchi tomonidan bekor qilindi",
    status: "offline",
  }).eq("id", id);

  return NextResponse.json({ ok: true, gatewayId: id });
}
