// ─── Pairing client — Jarvis Cloud bilan gaplashish ────────────────────────
import { requireServerUrl } from "./config.js";
import type { DiscoveredDevice } from "./discovery.js";

export type QrPayload = {
  pairingId: string;
  token: string;
  pairingEndpoint?: string;
};

export async function claimPairing(qr: QrPayload, gatewayId: string, publicKey: string, name: string): Promise<void> {
  const serverUrl = requireServerUrl();
  const res = await fetch(`${serverUrl}/api/cameras/pairing/gateway/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingId: qr.pairingId, token: qr.token, gatewayId, publicKey, name }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Claim rad etildi: ${data.error || res.status}`);
}

export async function reportDiscovery(pairingId: string, gatewayId: string, cameras: DiscoveredDevice[]): Promise<void> {
  const serverUrl = requireServerUrl();
  const res = await fetch(`${serverUrl}/api/cameras/pairing/gateway/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingId, gatewayId, cameras }),
  });
  const data = await res.json() as { ok: boolean; error?: string; found?: number };
  if (!data.ok) throw new Error(`Report rad etildi: ${data.error || res.status}`);
  console.log(`[pairing] ${data.found ?? 0} ta kamera Jarvis'ga yuborildi`);
}
