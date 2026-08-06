/**
 * Device command router — parses Uzbek/Russian voice commands and routes to
 * the appropriate device API (/api/phones or /api/computer).
 *
 * Called from /api/voice (after STT) to intercept device control intents
 * before the general AI reply.
 */

export type DeviceIntent =
  | { type: "phone"; action: string; payload: Record<string, string> }
  | { type: "computer"; action: string; payload: Record<string, string> }
  | null;

// Uzbek/Russian trigger patterns
const PHONE_PATTERNS: { re: RegExp; action: string; extract?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  {
    re: /sms\s+(?:yuvor|yoz|jo'nat)\s+(.+)/i,
    action: "sms",
    extract: m => ({ message: m[1].trim() }),
  },
  {
    re: /(?:qo'ng'iroq|zvonok|call)\s+(?:qil|ber|kil)?/i,
    action: "call",
    extract: m => ({ number: extractNumber(m.input || "") }),
  },
  {
    re: /(?:bildirishnoma|notification|xabar)\s+(?:yuvor|yubor|jo'nat)\s+(.+)/i,
    action: "notify",
    extract: m => ({ title: "Pari", message: m[1].trim() }),
  },
  {
    re: /ovoz(?:ni)?\s+(?:o'zgartir|qo'y|set)\s+(\d+)/i,
    action: "volume",
    extract: m => ({ level: m[1] }),
  },
  {
    re: /(?:telefon|tel)\s+(?:ovozi?|volume)\s+(\d+)/i,
    action: "volume",
    extract: m => ({ level: m[1] }),
  },
];

const COMPUTER_PATTERNS: { re: RegExp; action: string; extract?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  {
    re: /(?:screenshot|skrinshot|ekran\s+rasm|ekran\s+ol)/i,
    action: "screenshot",
    extract: () => ({}),
  },
  {
    re: /(?:yoz|type|tergin?)\s+"?(.+?)"?\s*(?:kompyuterga|pcga|pcda)?/i,
    action: "type",
    extract: m => ({ text: m[1].trim() }),
  },
  {
    re: /(?:ochiq|ochver|open)\s+(.+)/i,
    action: "open",
    extract: m => ({ app: m[1].trim() }),
  },
  {
    re: /(?:shell|terminal|buyruq)\s+(.+)/i,
    action: "shell",
    extract: m => ({ command: m[1].trim() }),
  },
  {
    re: /(?:kompyuter|pc)\s+(?:ovozi?|volume)\s+(\d+)/i,
    action: "volume",
    extract: m => ({ level: m[1] }),
  },
  {
    re: /(?:qulflash|lock|qulfa)\s+(?:kompyuter|pc|ekran)/i,
    action: "lock",
    extract: () => ({}),
  },
  {
    re: /(?:tizim\s+ma'lumot|sysinfo|tizim\s+info)/i,
    action: "sysinfo",
    extract: () => ({}),
  },
];

function extractNumber(text: string): string {
  const m = text.match(/\+?[\d\s\-()]{7,}/);
  return m ? m[0].replace(/\s/g, "") : "";
}

/** Parse transcript and return device intent if recognized, else null */
export function parseDeviceIntent(transcript: string): DeviceIntent {
  const t = transcript.trim();

  // Phone commands — require "telefon" or "tel" prefix unless action-specific
  const isPhoneCtx = /(?:telefon|tel(?:ga|da|ni)?|android|iphone|mobil)/i.test(t);
  for (const { re, action, extract } of PHONE_PATTERNS) {
    const m = t.match(re);
    if (m && (isPhoneCtx || action === "sms" || action === "call")) {
      return { type: "phone", action, payload: extract ? extract(m) : {} };
    }
  }

  // Computer commands
  const isPCCtx = /(?:kompyuter|pc|laptop|noutbuk|terminal|shell)/i.test(t);
  for (const { re, action, extract } of COMPUTER_PATTERNS) {
    const m = t.match(re);
    if (m && (isPCCtx || action === "screenshot")) {
      return { type: "computer", action, payload: extract ? extract(m) : {} };
    }
  }

  return null;
}

/** Returns true if the intent requires a registered device (may be unavailable) */
export function intentRequiresDevice(intent: DeviceIntent): boolean {
  return intent !== null;
}
