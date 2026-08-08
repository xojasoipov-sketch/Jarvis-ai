// POST /api/cameras/gateway/events — Gateway'ning event-engine'i (motion_detected,
// camera_online/offline, stream_lost/restored) shu yerga signed so'rov yuboradi.
//
// Body: { eventId, cameraId, type, timestamp, confidence?, metadata? }
//
// Ownership: cameraId gateway_id ustuni orqali shu gateway'ga tegishli
// ekanligi tekshiriladi — gateway boshqa gateway'ning kamerasiga event
// yoza olmaydi (8-band: "Never trust cameraId sent blindly by gateway").
import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { verifyGatewayRequest } from "@/lib/camera/gateway-auth";
import { createEvent, getCamera } from "@/lib/camera/camera-store";
import { sendCameraAlert } from "@/lib/camera/camera-notify";
import type { EventType, EventSeverity } from "@/lib/camera/types";

const KNOWN_EVENT_TYPES: EventType[] = [
  "motion_detected", "person_detected", "vehicle_detected", "animal_detected",
  "camera_online", "camera_offline", "stream_error",
];

function severityFor(type: string): EventSeverity {
  if (type === "person_detected") return "medium";
  if (type === "camera_offline" || type === "stream_error") return "medium";
  return "low";
}

export async function POST(req: NextRequest) {
  if (!dbConfigured || !supabase) return NextResponse.json({ ok: false, error: "Supabase sozlanmagan" }, { status: 500 });

  const rawBody = await req.text();
  const auth = await verifyGatewayRequest(req, rawBody);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = JSON.parse(rawBody) as {
    eventId?: string; cameraId?: string; type?: string; timestamp?: string;
    confidence?: number; metadata?: Record<string, unknown>;
  };

  if (!body.cameraId || !body.type) {
    return NextResponse.json({ ok: false, error: "cameraId, type kerak" }, { status: 400 });
  }
  if (!KNOWN_EVENT_TYPES.includes(body.type as EventType)) {
    return NextResponse.json({ ok: false, error: `Noma'lum event type: ${body.type}` }, { status: 400 });
  }

  const camera = await getCamera(body.cameraId);
  if (!camera) return NextResponse.json({ ok: false, error: "Kamera topilmadi" }, { status: 404 });
  if ((camera.metadata?.gateway_id as string) !== auth.gatewayId) {
    return NextResponse.json({ ok: false, error: "Bu kamera ushbu gateway'ga tegishli emas" }, { status: 403 });
  }

  const event = await createEvent({
    camera_id: camera.id,
    zone_id: null,
    event_type: body.type as EventType,
    severity: severityFor(body.type),
    started_at: body.timestamp || new Date().toISOString(),
    ended_at: null,
    duration_sec: null,
    track_id: null,
    snapshot_url: null,
    ai_summary: null,
    objects: [],
    metadata: { ...(body.metadata || {}), confidence: body.confidence, source_event_id: body.eventId },
  });

  // camera_offline/stream_error kabi darhol e'tibor talab qiladigan hodisalar
  // uchun Telegram alert — motion_detected past severity, cooldown bilan cheklanadi
  // (camera-notify.ts ichida allaqachon mavjud).
  sendCameraAlert(camera, event).catch((e) => console.error("[gateway-events] Telegram alert xatosi:", e instanceof Error ? e.message : e));

  return NextResponse.json({ ok: true, eventId: event.id });
}
