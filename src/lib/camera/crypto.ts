// ─── App-level encryption for secrets-at-rest (AES-256-GCM) ───────────────────
// Supabase Row-Level Security kamera credentials'ni himoya qiladi, lekin
// "encryption at rest" talabi uchun app qatlamida ham shifrlaymiz —
// DB'ga to'g'ridan-to'g'ri kirish (backup, dump, boshqa service_role) bilan
// plaintext token/appSecret ko'rinmasin.
//
// Key: EZVIZ_TOKEN_ENC_KEY env — 32 byte, base64 shaklida.
//   Yaratish: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// Agar key sozlanmagan bo'lsa — shifrlash o'tkazib yuboriladi (dev holat uchun),
// lekin production'da bu env majburiy bo'lishi kerak.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.EZVIZ_TOKEN_ENC_KEY;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

// Format: base64(iv):base64(authTag):base64(ciphertext)
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // dev fallback — encryption not configured
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith("enc:")) return stored; // plaintext (legacy or encryption not configured)
  const key = getKey();
  if (!key) throw new Error("EZVIZ_TOKEN_ENC_KEY sozlanmagan — shifrlangan qiymatni ochib bo'lmaydi");
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
