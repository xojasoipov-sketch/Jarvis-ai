// Qurilma pairing/auth — HMAC-SHA256 asosidagi stateless imzo (auth.ts bilan bir xil pattern).
// Edge Middleware/Runtime uchun Web Crypto (SubtleCrypto) ishlatiladi, Node crypto emas.
//
// Ikki xil token turi:
//  - Pairing token: qisqa muddatli (10 daqiqa), QR kodda yuboriladi, faqat pairing/confirm uchun.
//  - Device token: uzoq muddatli, pairing tasdiqlangandan keyin qurilmaga beriladi,
//    keyingi barcha so'rovlarda (heartbeat/poll/result) Authorization headerida ishlatiladi.
//    Revoke qilinganda DB'dagi device.revoked=true bo'ladi — token o'zi imzosi to'g'ri
//    bo'lsa ham DB tekshiruvi orqali rad etiladi (shuning uchun stateless emas, DB bilan tekshiriladi).

const SECRET = process.env.DEVICE_PAIRING_SECRET || process.env.APP_PASSWORD || "";
export const deviceAuthConfigured = Boolean(SECRET);

// Auto-pair: alohida, tor doiradagi maxfiy kalit — faqat APK ichiga qattiq yozilgan va
// birinchi ochilishda hech qanday QR/token almashinuvisiz darhol pairlash uchun ishlatiladi.
// APP_PASSWORD'dan ATAYLAB alohida: shu tufayli APK ichida veb-ilova login paroli emas,
// faqat shu bitta maqsad uchun yaroqli kalit yotadi.
const AUTO_PAIR_SECRET = process.env.DEVICE_AUTO_PAIR_KEY || "";
export const autoPairConfigured = Boolean(AUTO_PAIR_SECRET);

export function verifyAutoPairKey(token: string): boolean {
  if (!AUTO_PAIR_SECRET || !token) return false;
  if (token.length !== AUTO_PAIR_SECRET.length) return false;
  return timingSafeEqualHex(token, AUTO_PAIR_SECRET);
}

const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 daqiqa

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Vaqtinchalik pairing tokeni: device_id + expiry ga imzo qo'yadi. QR kodga shu boradi. */
export async function createPairingToken(deviceId: string): Promise<{ token: string; expires_at: string }> {
  const expiry = Date.now() + PAIRING_TTL_MS;
  const payload = `pair:${deviceId}:${expiry}`;
  const sig = await hmac(payload);
  return { token: `${expiry}.${sig}`, expires_at: new Date(expiry).toISOString() };
}

export async function verifyPairingToken(deviceId: string, token: string): Promise<boolean> {
  if (!SECRET || !token) return false;
  const [expiry, sig] = token.split(".");
  if (!expiry || !sig) return false;
  if (Date.now() > Number(expiry)) return false; // muddati o'tgan
  const expected = await hmac(`pair:${deviceId}:${expiry}`);
  return timingSafeEqualHex(expected, sig);
}

/** Uzoq muddatli device tokeni — pairing tasdiqlangandan keyin beriladi. Muddatsiz, faqat revoke bekor qiladi. */
export async function createDeviceToken(deviceId: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const payload = `dev:${deviceId}:${nonce}`;
  const sig = await hmac(payload);
  return `${nonce}.${sig}`;
}

export async function verifyDeviceToken(deviceId: string, token: string): Promise<boolean> {
  if (!SECRET || !token) return false;
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = await hmac(`dev:${deviceId}:${nonce}`);
  return timingSafeEqualHex(expected, sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
