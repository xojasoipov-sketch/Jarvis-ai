// ─── Pairing client — Jarvis Cloud bilan gaplashish ────────────────────────
import { requireServerUrl } from "./config.js";
import { currentIdentity, signedFetch } from "./signed-fetch.js";
import type { DiscoveredDevice } from "./discovery.js";

export type QrPayload = {
  pairingId: string;
  token: string;
  pairingEndpoint?: string;
};

// Claim — bir martalik pairing token orqali gateway o'z Ed25519 public
// key'ini birinchi marta cloud'ga ro'yxatdan o'tkazadi. Bu so'rov hali
// signedFetch bilan emas (cloud'da public key hali yo'q, tekshirib bo'lmaydi) —
// ishonch shu bir martalik tokenning o'zidan keladi (27-band).
export async function claimPairing(qr: QrPayload, name: string): Promise<void> {
  const serverUrl = requireServerUrl();
  const { deviceId, publicKeyBase64 } = currentIdentity();
  const res = await fetch(`${serverUrl}/api/cameras/pairing/gateway/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingId: qr.pairingId, token: qr.token, gatewayId: deviceId, publicKey: publicKeyBase64, name }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Claim rad etildi: ${data.error || res.status}`);
}

// Report — claim'dan keyingi barcha so'rovlar Ed25519 bilan imzolanadi va
// cloud claim paytida saqlangan public key bilan tekshiradi.
export async function reportDiscovery(pairingId: string, cameras: DiscoveredDevice[]): Promise<void> {
  const serverUrl = requireServerUrl();
  const { deviceId } = currentIdentity();
  const res = await signedFetch(serverUrl, "/api/cameras/pairing/gateway/report", { pairingId, gatewayId: deviceId, cameras });
  const data = await res.json() as { ok: boolean; error?: string; found?: number };
  if (!data.ok) throw new Error(`Report rad etildi: ${data.error || res.status}`);
  console.log(`[pairing] ${data.found ?? 0} ta kamera Jarvis'ga yuborildi`);
}
