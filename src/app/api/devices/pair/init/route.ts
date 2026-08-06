import { NextResponse } from "next/server";
import { createPendingDevice, savePairing } from "@/lib/device-store";
import { createPairingToken, deviceAuthConfigured } from "@/lib/device-auth";
import { log } from "@/lib/logger";

// POST /api/devices/pair/init — "Add Device" bosilganda: unikal device_id + vaqtinchalik
// pairing token yaratadi, QR kod uchun deep link va rasm URL qaytaradi.
export async function POST(req: Request) {
  if (!deviceAuthConfigured) {
    return NextResponse.json({ error: "DEVICE_PAIRING_SECRET yoki APP_PASSWORD sozlanmagan" }, { status: 503 });
  }

  const deviceId = await createPendingDevice();
  const { token, expires_at } = await createPairingToken(deviceId);
  await savePairing(deviceId, expires_at);

  const origin = new URL(req.url).origin;
  const deepLink = `jarvis://pair?device_id=${deviceId}&token=${token}&server=${encodeURIComponent(origin)}`;
  // Deep link ochilmasa (agent o'rnatilmagan bo'lsa) tushadigan fallback — o'rnatish sahifasi
  const fallbackUrl = `${origin}/setup/phone?device_id=${deviceId}&token=${encodeURIComponent(token)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;

  log("info", "devices", `Pairing boshlandi: ${deviceId}`);
  return NextResponse.json({ device_id: deviceId, token, expires_at, deep_link: deepLink, fallback_url: fallbackUrl, qr_url: qrUrl });
}
