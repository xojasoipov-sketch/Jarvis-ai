import { NextRequest, NextResponse } from "next/server";
import { submitResult, verifyDeviceSession } from "@/lib/device-store";

// POST /api/devices/result — Agent bajarilgan buyruq natijasini qaytaradi.
// Header: Authorization: Bearer <device_token>
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_id, cmd_id, result, status } = body;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!device_id || !cmd_id || !token) return NextResponse.json({ error: "device_id, cmd_id va token kerak" }, { status: 400 });
  const valid = await verifyDeviceSession(device_id, token);
  if (!valid) return NextResponse.json({ error: "Ruxsat berilmagan yoki qurilma bekor qilingan" }, { status: 401 });

  await submitResult(cmd_id, result, status === "error" ? "error" : "done");
  return NextResponse.json({ ok: true });
}
