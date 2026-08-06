import { NextRequest, NextResponse } from "next/server";
import { listDevices, removeDevice, markStaleOffline } from "@/lib/device-store";

// GET /api/devices — Jarvis Device Manager uchun ro'yxat
export async function GET() {
  await markStaleOffline();
  const devices = await listDevices();
  return NextResponse.json({ devices });
}

// DELETE /api/devices?id=... — qurilmani butunlay o'chirish
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await removeDevice(id);
  return NextResponse.json({ ok: true });
}
