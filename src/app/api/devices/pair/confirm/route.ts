import { NextRequest, NextResponse } from "next/server";
import { consumePairing, confirmDevice, type Platform } from "@/lib/device-store";
import { verifyPairingToken, createDeviceToken } from "@/lib/device-auth";
import { log } from "@/lib/logger";

// POST /api/devices/pair/confirm — Jarvis Agent (Termux/Kotlin) QR tokenni serverga yuboradi.
// Muvaffaqiyatli bo'lsa, keyingi barcha so'rovlar uchun uzoq muddatli device_token qaytaradi.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_id, token, name, platform, os_info } = body;

  if (!device_id || !token) {
    return NextResponse.json({ error: "device_id va token kerak" }, { status: 400 });
  }

  const validToken = await verifyPairingToken(device_id, token);
  if (!validToken) {
    return NextResponse.json({ error: "Token noto'g'ri yoki muddati o'tgan" }, { status: 401 });
  }

  const consumed = await consumePairing(device_id);
  if (!consumed) {
    return NextResponse.json({ error: "Bu pairing allaqachon ishlatilgan yoki muddati o'tgan" }, { status: 409 });
  }

  const deviceToken = await createDeviceToken(device_id);
  const validPlatforms: Platform[] = ["android", "ios", "windows", "macos", "linux"];
  const device = await confirmDevice(
    device_id,
    { name: name || "Yangi qurilma", platform: validPlatforms.includes(platform) ? platform : "android", os_info },
    deviceToken
  );

  if (!device) return NextResponse.json({ error: "Qurilma topilmadi" }, { status: 404 });

  log("info", "devices", `Qurilma ulandi: ${device.name} (${device_id})`);
  return NextResponse.json({ ok: true, device_id, device_token: deviceToken, device });
}
