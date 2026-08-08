// POST /api/cameras/pairing/gateway/claim — Camera Gateway QR'ni skan qilgach chaqiradi.
// Body: { pairingId, token, gatewayId, publicKey, name? }
import { NextRequest, NextResponse } from "next/server";
import { claimPairing } from "@/lib/camera/pairing";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json() as { pairingId?: string; token?: string; gatewayId?: string; publicKey?: string; name?: string };
  const { pairingId, token, gatewayId, publicKey } = body;

  if (!pairingId || !token || !gatewayId || !publicKey) {
    return NextResponse.json({ ok: false, error: "pairingId, token, gatewayId, publicKey kerak" }, { status: 400 });
  }

  // Gateway'ni ro'yxatdan o'tkazamiz/yangilaymiz (public key bilan)
  if (dbConfigured && supabase) {
    await supabase.from("camera_gateways").upsert({
      id: gatewayId,
      name: body.name || "Camera Gateway",
      public_key: publicKey,
      status: "online",
      last_seen: new Date().toISOString(),
    });
  }

  const result = await claimPairing(pairingId, token, gatewayId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, pairingId, gatewayId });
}
