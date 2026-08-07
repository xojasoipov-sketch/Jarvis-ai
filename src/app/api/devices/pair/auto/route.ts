import { NextRequest, NextResponse } from "next/server";
import { createPendingDevice, confirmDevice, type Platform } from "@/lib/device-store";
import { createDeviceToken, verifyAutoPairKey, autoPairConfigured } from "@/lib/device-auth";
import { log } from "@/lib/logger";

// POST /api/devices/pair/auto — ilova birinchi ochilganda, QR/deep-link almashinuvisiz,
// APK ichiga qattiq yozilgan DEVICE_AUTO_PAIR_KEY orqali darhol pairlanadi.
// Header: Authorization: Bearer <DEVICE_AUTO_PAIR_KEY>
export async function POST(req: NextRequest) {
  if (!autoPairConfigured) {
    return NextResponse.json({ error: "DEVICE_AUTO_PAIR_KEY sozlanmagan" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !verifyAutoPairKey(token)) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, platform, model, os_version, app_version } = body;

  const deviceId = await createPendingDevice();
  const deviceToken = await createDeviceToken(deviceId);
  const validPlatforms: Platform[] = ["android", "ios", "windows", "macos", "linux"];
  const osInfo = [model, os_version, app_version ? `app ${app_version}` : null].filter(Boolean).join(" / ");

  const device = await confirmDevice(
    deviceId,
    {
      name: name || "Android qurilma",
      platform: validPlatforms.includes(platform) ? platform : "android",
      os_info: osInfo,
    },
    deviceToken
  );

  if (!device) return NextResponse.json({ error: "Qurilma yaratilmadi" }, { status: 500 });

  log("info", "devices", `Auto-pair: ${device.name} (${deviceId})`);
  return NextResponse.json({ ok: true, device_id: deviceId, device_token: deviceToken, name: device.name, device });
}
