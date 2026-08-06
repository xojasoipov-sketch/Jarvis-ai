import { NextRequest, NextResponse } from "next/server";
import { pollCommands, verifyDeviceSession } from "@/lib/device-store";

// GET /api/devices/poll?device_id=... — Agent kutilayotgan buyruqlarni so'raydi.
// Header: Authorization: Bearer <device_token>
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!deviceId || !token) return NextResponse.json({ error: "device_id va token kerak" }, { status: 400 });
  const valid = await verifyDeviceSession(deviceId, token);
  if (!valid) return NextResponse.json({ error: "Ruxsat berilmagan yoki qurilma bekor qilingan" }, { status: 401 });

  const commands = await pollCommands(deviceId);
  return NextResponse.json({ commands });
}
