// ─── Gateway configuration ─────────────────────────────────────────────────
// Barcha sozlamalar env orqali beriladi — gateway o'zi state faylida
// (gateway-state.json) deviceId va keypair'ni saqlaydi.

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const JARVIS_SERVER_URL = (process.env.JARVIS_SERVER_URL || "").replace(/\/$/, "");
export const GATEWAY_NAME = process.env.GATEWAY_NAME || "Camera Gateway";

// Local network discovery diapazoni — user explicit ruxsat bermasa, faqat
// gateway o'zi ulangan interfeys subnetida ONVIF WS-Discovery ishlaydi
// (multicast, agressiv port-scan emas).
export const DISCOVERY_TIMEOUT_MS = Number(process.env.DISCOVERY_TIMEOUT_MS || 5000);

const STATE_FILE = join(process.cwd(), "gateway-state.json");

type GatewayState = {
  gatewayId: string;
  // MVP: gateway identity 32-byte tasodifiy hex qiymat bilan ifodalanadi.
  // Production'da bu asimmetrik keypair (Ed25519) bo'lishi va har bir
  // /report so'rovi shu key bilan imzolanishi kerak (28-band: Device
  // Authentication) — hozircha bu qism amalga oshirilmagan, bilib qo'ying.
  publicKey: string;
};

export function loadOrCreateState(): GatewayState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as GatewayState;
  }
  const state: GatewayState = {
    gatewayId: randomBytes(16).toString("hex"),
    publicKey: randomBytes(32).toString("hex"), // TODO: haqiqiy Ed25519 public key bilan almashtirilsin
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

export function requireServerUrl(): string {
  if (!JARVIS_SERVER_URL) {
    throw new Error("JARVIS_SERVER_URL env sozlanmagan (masalan: https://your-jarvis.app)");
  }
  return JARVIS_SERVER_URL;
}
