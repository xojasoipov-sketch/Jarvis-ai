// ─── Camera Pairing Protocol ──────────────────────────────────────────────────
// QR pairing: Mini App session yaratadi → QR kodga token qo'yiladi → gateway
// token bilan o'zini shu sessionga bog'laydi (claim).
//
// Xavfsizlik qoidalari (27-band):
//   - Token qisqa muddatli (5 daqiqa), bir martalik (claim'dan keyin invalidate)
//   - QR ichida hech qanday parol/secret/API key bo'lmaydi — faqat pairingId
//     va HMAC-signed token
//   - Token'ning o'zi DB'da saqlanmaydi, faqat uning HMAC hash'i (token_hash)
//     — shunda DB dump bo'lsa ham tokenni qayta tiklab bo'lmaydi

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { supabase, dbConfigured } from "@/lib/supabase";

const PAIRING_TTL_MS = 5 * 60_000; // 5 daqiqa

function getSigningKey(): string {
  const key = process.env.CAMERA_PAIRING_SECRET;
  if (!key) {
    throw new Error(
      "CAMERA_PAIRING_SECRET sozlanmagan. " +
      "Yaratish: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return key;
}

function hashToken(token: string): string {
  return createHmac("sha256", getSigningKey()).update(token).digest("hex");
}

export type PairingQrPayload = {
  pairingId: string;
  token: string;           // xom token — faqat QR'da, DB'da saqlanmaydi
  pairingEndpoint: string; // gateway shu endpointga POST qiladi
  expiresAt: string;
};

// ─── Pairing session yaratish (Mini App "+ Add Camera → Scan QR") ────────────
export async function createPairingSession(baseUrl: string): Promise<PairingQrPayload> {
  if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  const { data, error } = await supabase.from("camera_pairings").insert({
    status: "pending",
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  }).select("id").single();

  if (error || !data) throw new Error(`Pairing session yaratilmadi: ${error?.message || "unknown"}`);

  return {
    pairingId: data.id as string,
    token,
    pairingEndpoint: `${baseUrl}/api/cameras/pairing/gateway/claim`,
    expiresAt: expiresAt.toISOString(),
  };
}

// ─── Gateway pairingni claim qiladi (token'ni bir marta ishlatadi) ───────────
export async function claimPairing(pairingId: string, token: string, gateway_id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!dbConfigured || !supabase) return { ok: false, error: "Supabase sozlanmagan" };

  const { data: pairing } = await supabase.from("camera_pairings").select("*").eq("id", pairingId).single();
  if (!pairing) return { ok: false, error: "Pairing session topilmadi" };
  if (pairing.status !== "pending") return { ok: false, error: "Pairing token allaqachon ishlatilgan yoki tugagan" };
  if (new Date(pairing.expires_at as string) < new Date()) {
    await supabase.from("camera_pairings").update({ status: "expired" }).eq("id", pairingId);
    return { ok: false, error: "Pairing token muddati tugagan (5 daqiqa)" };
  }

  const expectedHash = Buffer.from(pairing.token_hash as string, "hex");
  const actualHash = Buffer.from(hashToken(token), "hex");
  if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    return { ok: false, error: "Noto'g'ri pairing token" };
  }

  // Bir martalik — darhol claimed qilamiz, boshqa claim urinishi rad etiladi
  await supabase.from("camera_pairings").update({
    status: "claimed", gateway_id, claimed_at: new Date().toISOString(),
  }).eq("id", pairingId).eq("status", "pending");

  return { ok: true };
}

// ─── Mini App polling uchun holat ─────────────────────────────────────────────
export async function getPairingStatus(pairingId: string) {
  if (!dbConfigured || !supabase) return null;
  const { data: pairing } = await supabase.from("camera_pairings").select("*").eq("id", pairingId).single();
  if (!pairing) return null;
  const { data: results } = await supabase.from("camera_discovery_results").select("*").eq("pairing_id", pairingId);
  return { pairing, discovered: results || [] };
}
