const SECRET = process.env.APP_PASSWORD || "";
export const authConfigured = Boolean(SECRET);

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun

// Edge Middleware only has Web Crypto (SubtleCrypto), not Node's `crypto` module.
async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stateless signed session — no DB needed. Cookie value is `${expiry}.${hmac}`.
export async function createSessionToken(): Promise<string> {
  const expiry = Date.now() + MAX_AGE_MS;
  return `${expiry}.${await hmac(String(expiry))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !SECRET) return false;
  const [expiry, sig] = token.split(".");
  if (!expiry || !sig) return false;
  if (Date.now() > Number(expiry)) return false;
  return (await hmac(expiry)) === sig;
}

export function checkPassword(input: string): boolean {
  if (!SECRET) return false;
  // Constant-time-ish comparison without Node's crypto.timingSafeEqual (not available on Edge)
  if (input.length !== SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ SECRET.charCodeAt(i);
  return diff === 0;
}
