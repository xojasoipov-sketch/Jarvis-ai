import { NextRequest, NextResponse } from "next/server";
import { revokeDevice } from "@/lib/device-store";
import { log } from "@/lib/logger";

// POST /api/devices/revoke — qurilma sessiyasini bekor qilish (device_token endi ishlamaydi,
// lekin qurilma ro'yxatda qoladi — butunlay o'chirish uchun DELETE /api/devices?id= ishlating)
export async function POST(req: NextRequest) {
  const { device_id } = await req.json().catch(() => ({}));
  if (!device_id) return NextResponse.json({ error: "device_id kerak" }, { status: 400 });
  await revokeDevice(device_id);
  log("info", "devices", `Qurilma bekor qilindi (revoke): ${device_id}`);
  return NextResponse.json({ ok: true });
}
