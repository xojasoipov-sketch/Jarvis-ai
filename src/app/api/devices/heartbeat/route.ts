import { NextRequest, NextResponse } from "next/server";
import { heartbeat, verifyDeviceSession } from "@/lib/device-store";

// POST /api/devices/heartbeat — Agent har X soniyada holatini yuboradi.
// Header: Authorization: Bearer <device_token>
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_id, battery, storage_free, cpu_load, ram_used, location } = body;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!device_id || !token) return NextResponse.json({ error: "device_id va token kerak" }, { status: 400 });
  const valid = await verifyDeviceSession(device_id, token);
  if (!valid) return NextResponse.json({ error: "Ruxsat berilmagan yoki qurilma bekor qilingan" }, { status: 401 });

  await heartbeat(device_id, { battery, storage_free, cpu_load, ram_used, location });
  return NextResponse.json({ ok: true });
}
