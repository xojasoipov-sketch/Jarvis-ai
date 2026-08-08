// POST /api/cameras/pairing/gateway/report — Gateway ONVIF/RTSP discovery natijasini yuboradi.
// Body: { pairingId, gatewayId, cameras: [{ localDeviceId, name, manufacturer, model, ip, protocols }] }
//
// Bu so'rov Ed25519 bilan imzolangan bo'lishi shart (claim paytida ro'yxatdan
// o'tgan public key bilan tekshiriladi) — gateway_id shunchaki body ichida
// aytilgan qiymat emas, imzo orqali isbotlangan identity (gateway-auth.ts).
import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { verifyGatewayRequest } from "@/lib/camera/gateway-auth";

type DiscoveredCamera = {
  localDeviceId: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  ip?: string;
  protocols?: { rtsp?: boolean; onvif?: boolean; ptz?: boolean; audio?: boolean; snapshot?: boolean };
};

export async function POST(req: NextRequest) {
  if (!dbConfigured || !supabase) {
    return NextResponse.json({ ok: false, error: "Supabase sozlanmagan" }, { status: 500 });
  }

  const rawBody = await req.text();
  const auth = await verifyGatewayRequest(req, rawBody);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = JSON.parse(rawBody) as { pairingId?: string; gatewayId?: string; cameras?: DiscoveredCamera[] };
  const { pairingId, cameras } = body;
  const gatewayId = auth.gatewayId; // imzo orqali tasdiqlangan — body.gatewayId'ga ishonmaymiz

  if (!pairingId || !Array.isArray(cameras)) {
    return NextResponse.json({ ok: false, error: "pairingId, cameras kerak" }, { status: 400 });
  }

  const { data: pairing } = await supabase.from("camera_pairings").select("*").eq("id", pairingId).single();
  if (!pairing) return NextResponse.json({ ok: false, error: "Pairing session topilmadi" }, { status: 404 });
  if (pairing.gateway_id !== gatewayId) {
    return NextResponse.json({ ok: false, error: "Bu gateway ushbu pairing sessionni claim qilmagan" }, { status: 403 });
  }

  if (cameras.length === 0) {
    await supabase.from("camera_pairings").update({ status: "claimed" }).eq("id", pairingId);
    return NextResponse.json({ ok: true, found: 0 });
  }

  const rows = cameras.map((c) => ({
    pairing_id: pairingId,
    gateway_id: gatewayId,
    local_device_id: c.localDeviceId,
    name: c.name || `Kamera ${c.localDeviceId.slice(-6)}`,
    manufacturer: c.manufacturer || "",
    model: c.model || "",
    ip: c.ip || "",
    protocols: c.protocols || {},
  }));

  await supabase.from("camera_discovery_results").insert(rows);
  await supabase.from("camera_pairings").update({ status: "cameras_found" }).eq("id", pairingId);

  return NextResponse.json({ ok: true, found: rows.length });
}
