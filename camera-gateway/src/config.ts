// ─── Gateway configuration ─────────────────────────────────────────────────
// Device identity (deviceId + Ed25519 keypair) endi identity.ts'da —
// gateway-identity.json faylida saqlanadi (bu yerda emas).

export const JARVIS_SERVER_URL = (process.env.JARVIS_SERVER_URL || "").replace(/\/$/, "");
export const GATEWAY_NAME = process.env.GATEWAY_NAME || "Camera Gateway";

// Local network discovery diapazoni — user explicit ruxsat bermasa, faqat
// gateway o'zi ulangan interfeys subnetida ONVIF WS-Discovery ishlaydi
// (multicast, agressiv port-scan emas).
export const DISCOVERY_TIMEOUT_MS = Number(process.env.DISCOVERY_TIMEOUT_MS || 5000);

export function requireServerUrl(): string {
  if (!JARVIS_SERVER_URL) {
    throw new Error("JARVIS_SERVER_URL env sozlanmagan (masalan: https://your-jarvis.app)");
  }
  return JARVIS_SERVER_URL;
}
