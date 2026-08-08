// POST /api/cameras/pairing/confirm — user discovered camera'ni tanlab, login
// ma'lumotini kiritgach (7-band: "Camera Login"), uni real `cameras` yozuviga aylantiradi.
// Body: { discoveryResultId, username, password }
import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { createCamera, setCameraCredentials } from "@/lib/camera/camera-store";

export async function POST(req: NextRequest) {
  if (!dbConfigured || !supabase) {
    return NextResponse.json({ ok: false, error: "Supabase sozlanmagan" }, { status: 500 });
  }

  const body = await req.json() as { discoveryResultId?: string; username?: string; password?: string; name?: string };
  const { discoveryResultId, username, password } = body;
  if (!discoveryResultId || !username || !password) {
    return NextResponse.json({ ok: false, error: "discoveryResultId, username, password kerak" }, { status: 400 });
  }

  const { data: disc } = await supabase.from("camera_discovery_results").select("*").eq("id", discoveryResultId).single();
  if (!disc) return NextResponse.json({ ok: false, error: "Discovery natijasi topilmadi" }, { status: 404 });

  const protocols = (disc.protocols as Record<string, boolean>) || {};

  const cam = await createCamera({
    name: body.name || (disc.name as string) || "Yangi kamera",
    provider: "rtsp", // gateway RTSP/ONVIF orqali boshqaradi — EZVIZ cloud emas
    location: "home",
    serial: disc.local_device_id as string,
    rtsp_url: "", // Gateway runtime'da username/password bilan tuziladi (credentials orqali)
    capabilities: {
      live: Boolean(protocols.rtsp),
      snapshot: Boolean(protocols.snapshot ?? protocols.onvif),
      recording: false,
      audio: Boolean(protocols.audio),
      ptz: Boolean(protocols.ptz),
      motion_detection: false,
      rtsp: Boolean(protocols.rtsp),
    },
    metadata: {
      gateway_id: disc.gateway_id,
      local_device_id: disc.local_device_id,
      manufacturer: disc.manufacturer,
      model: disc.model,
      ip: disc.ip,
      onvif: Boolean(protocols.onvif),
    },
    enabled: true,
  });

  // Credentials shifrlab saqlanadi (crypto.ts orqali, camera-store.setCameraCredentials ichida)
  await setCameraCredentials(cam.id, { username, password, gateway_id: disc.gateway_id as string });

  await supabase.from("cameras").update({
    gateway_id: disc.gateway_id, local_device_id: disc.local_device_id,
  }).eq("id", cam.id);

  return NextResponse.json({ ok: true, camera: cam });
}
