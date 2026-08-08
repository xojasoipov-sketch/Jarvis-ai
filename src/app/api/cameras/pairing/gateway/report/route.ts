// POST /api/cameras/pairing/gateway/report — Gateway ONVIF/RTSP discovery natijasini yuboradi.
// Body: { pairingId, gatewayId, cameras: [{ localDeviceId, name, manufacturer, model, ip, protocols }] }
//
// Gateway faqat o'zi claim qilgan pairing_id uchun report yubora oladi — boshqa
// sessionlarga yozib bo'lmaydi (gateway_id moslik tekshiriladi).
import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

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

  const body = await req.json() as { pairingId?: string; gatewayId?: string; cameras?: DiscoveredCamera[] };
  const { pairingId, gatewayId, cameras } = body;

  if (!pairingId || !gatewayId || !Array.isArray(cameras)) {
    return NextResponse.json({ ok: false, error: "pairingId, gatewayId, cameras kerak" }, { status: 400 });
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
  await supabase.from("camera_gateways").update({ status: "online", last_seen: new Date().toISOString() }).eq("id", gatewayId);

  return NextResponse.json({ ok: true, found: rows.length });
}
