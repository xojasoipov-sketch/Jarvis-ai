// ─── Gateway request verification (Ed25519) ────────────────────────────────
// Pairing claim'dan keyin gateway'ning barcha so'rovlari Ed25519 bilan
// imzolanadi (camera-gateway/src/identity.ts + signed-fetch.ts). Bu modul
// cloud tarafda o'sha imzoni tekshiradi.
//
// Tekshiriladi (12-band):
//   - timestamp muddati (5 daqiqadan eski/kelajakdagi so'rov rad etiladi)
//   - nonce qayta ishlatilmagan (replay protection)
//   - gateway revoke qilinmagan
//   - signature public key bilan mos keladi

import { createPublicKey, createHash, verify as cryptoVerify } from "crypto";
import { NextRequest } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

const MAX_CLOCK_SKEW_MS = 5 * 60_000; // 5 daqiqa

export type GatewayAuthResult =
  | { ok: true; gatewayId: string }
  | { ok: false; error: string; status: number };

export async function verifyGatewayRequest(req: NextRequest, rawBody: string): Promise<GatewayAuthResult> {
  if (!dbConfigured || !supabase) return { ok: false, error: "Supabase sozlanmagan", status: 500 };

  const deviceId = req.headers.get("x-device-id") || "";
  const timestamp = req.headers.get("x-timestamp") || "";
  const nonce = req.headers.get("x-nonce") || "";
  const signature = req.headers.get("x-signature") || "";

  if (!deviceId || !timestamp || !nonce || !signature) {
    return { ok: false, error: "Signed request headerlari yetishmayapti (X-Device-ID/X-Timestamp/X-Nonce/X-Signature)", status: 401 };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: "Timestamp muddati tugagan yoki noto'g'ri", status: 401 };
  }

  const { data: gateway } = await supabase.from("camera_gateways").select("*").eq("id", deviceId).single();
  if (!gateway) return { ok: false, error: "Noma'lum gateway", status: 401 };
  if (gateway.revoked_at) return { ok: false, error: "Gateway revoke qilingan", status: 403 };
  if (!gateway.public_key) return { ok: false, error: "Gateway public key yo'q", status: 401 };

  // Replay protection: (gateway_id, nonce) unique constraint — takroriy
  // insert conflict bo'lsa, bu nonce oldin ishlatilgan degani.
  const { error: nonceError } = await supabase.from("gateway_nonces").insert({ gateway_id: deviceId, nonce });
  if (nonceError) {
    return { ok: false, error: "Nonce qayta ishlatildi (replay urinishi)", status: 401 };
  }

  const url = new URL(req.url);
  const bodyHash = createHash("sha256").update(rawBody).digest("base64");
  const payload = `${req.method.toUpperCase()}\n${url.pathname}\n${timestamp}\n${nonce}\n${bodyHash}`;

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(gateway.public_key as string, "base64"),
      format: "der",
      type: "spki",
    });
    const valid = cryptoVerify(null, Buffer.from(payload), publicKey, Buffer.from(signature, "base64"));
    if (!valid) return { ok: false, error: "Imzo mos kelmadi", status: 401 };
  } catch {
    return { ok: false, error: "Public key yoki imzo formati noto'g'ri", status: 401 };
  }

  await supabase.from("camera_gateways").update({ status: "online", last_seen: new Date().toISOString() }).eq("id", deviceId);

  return { ok: true, gatewayId: deviceId };
}

// Eski nonce yozuvlarini tozalash — cron/health-check chaqiruvida ishlatiladi
export async function cleanupOldNonces(): Promise<void> {
  if (!dbConfigured || !supabase) return;
  const cutoff = new Date(Date.now() - MAX_CLOCK_SKEW_MS * 2).toISOString();
  await supabase.from("gateway_nonces").delete().lt("created_at", cutoff);
}
