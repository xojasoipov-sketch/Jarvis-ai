import { NextRequest, NextResponse } from "next/server";
import { createPendingDevice, confirmDevice, type Platform } from "@/lib/device-store";
import { createDeviceToken, verifyAutoPairKey, autoPairConfigured } from "@/lib/device-auth";
import { log } from "@/lib/logger";

// TEMPORARY: the phone reports 401 while the same key succeeds via curl, so we
// need to see what the phone actually sends. Records a fingerprint only — never
// the key itself. Remove once pairing is confirmed working from the device.
type Attempt = {
  at: string;
  ua: string | null;
  hadHeader: boolean;
  keyPrefix: string;
  keyLen: number;
  matched: boolean;
};
const recentAttempts: Attempt[] = [];

// GET /api/devices/pair/auto — last few pairing attempts, for diagnosis.
export async function GET() {
  return NextResponse.json({ attempts: recentAttempts.slice(0, 10) });
}

// POST /api/devices/pair/auto — ilova birinchi ochilganda, QR/deep-link almashinuvisiz,
// APK ichiga qattiq yozilgan DEVICE_AUTO_PAIR_KEY orqali darhol pairlanadi.
// Header: Authorization: Bearer <DEVICE_AUTO_PAIR_KEY>
export async function POST(req: NextRequest) {
  if (!autoPairConfigured) {
    return NextResponse.json({ error: "DEVICE_AUTO_PAIR_KEY sozlanmagan" }, { status: 503 });
  }

  const rawAuth = req.headers.get("authorization");
  const token = rawAuth?.replace(/^Bearer\s+/i, "");
  const matched = Boolean(token && verifyAutoPairKey(token));

  recentAttempts.unshift({
    at: new Date().toISOString(),
    ua: req.headers.get("user-agent"),
    hadHeader: Boolean(rawAuth),
    keyPrefix: token ? token.slice(0, 6) : "",
    keyLen: token?.length ?? 0,
    matched,
  });
  if (recentAttempts.length > 10) recentAttempts.length = 10;

  if (!matched) {
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
