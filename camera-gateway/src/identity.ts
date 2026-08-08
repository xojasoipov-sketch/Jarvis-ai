// ─── Device Identity (Ed25519) ─────────────────────────────────────────────
// Har bir gateway o'zining Ed25519 keypair'ini generatsiya qiladi va lokal
// diskda saqlaydi. Private key HECH QACHON tarmoqqa yuborilmaydi — faqat
// so'rovlarni imzolash uchun ishlatiladi. Cloud faqat public key'ni ko'radi.

import { generateKeyPairSync, createPrivateKey, sign, randomBytes, createHash, type KeyObject } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

const IDENTITY_FILE = join(process.cwd(), "gateway-identity.json");

type StoredIdentity = {
  deviceId: string;
  privateKeyPem: string; // faqat shu faylda — hech qachon export/log qilinmaydi
  publicKeyBase64: string;
};

let cached: { deviceId: string; privateKey: KeyObject; publicKeyBase64: string } | null = null;

export function loadOrCreateIdentity(): { deviceId: string; publicKeyBase64: string } {
  if (cached) return { deviceId: cached.deviceId, publicKeyBase64: cached.publicKeyBase64 };

  if (existsSync(IDENTITY_FILE)) {
    const stored = JSON.parse(readFileSync(IDENTITY_FILE, "utf8")) as StoredIdentity;
    const privateKey = createPrivateKey(stored.privateKeyPem);
    cached = { deviceId: stored.deviceId, privateKey, publicKeyBase64: stored.publicKeyBase64 };
    return { deviceId: stored.deviceId, publicKeyBase64: stored.publicKeyBase64 };
  }

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const deviceId = randomBytes(16).toString("hex");
  const publicKeyBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;

  writeFileSync(IDENTITY_FILE, JSON.stringify({ deviceId, privateKeyPem, publicKeyBase64 } satisfies StoredIdentity, null, 2));
  try { chmodSync(IDENTITY_FILE, 0o600); } catch { /* Windows'da chmod ishlamasligi mumkin — bilib qo'yamiz */ }

  cached = { deviceId, privateKey, publicKeyBase64 };
  return { deviceId, publicKeyBase64 };
}

// method+path+timestamp+nonce+bodyHash ustidan imzo — cloud tomon xuddi shu
// stringni qayta tuzib tekshiradi (gateway-auth.ts, cloud tarafda).
export function signRequest(method: string, path: string, body: string): { timestamp: string; nonce: string; signature: string; deviceId: string } {
  if (!cached) loadOrCreateIdentity();
  const timestamp = String(Date.now());
  const nonce = randomBytes(12).toString("base64url");
  const bodyHash = createHash("sha256").update(body).digest("base64");
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = sign(null, Buffer.from(payload), cached!.privateKey).toString("base64");
  return { timestamp, nonce, signature, deviceId: cached!.deviceId };
}
