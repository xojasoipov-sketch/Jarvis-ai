// ─── Signed outbound requests ──────────────────────────────────────────────
// Pairing claim'dan keyingi barcha gateway→cloud so'rovlari Ed25519 bilan
// imzolanadi. Cloud tomon shu imzoni tekshiradi (gateway-auth.ts).

import { signRequest, loadOrCreateIdentity } from "./identity.js";

export async function signedFetch(serverUrl: string, path: string, body: Record<string, unknown>): Promise<Response> {
  const bodyStr = JSON.stringify(body);
  const { timestamp, nonce, signature, deviceId } = signRequest("POST", path, bodyStr);
  return fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": deviceId,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
    body: bodyStr,
  });
}

export function currentIdentity() {
  return loadOrCreateIdentity();
}
