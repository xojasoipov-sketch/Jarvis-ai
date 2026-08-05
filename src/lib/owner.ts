/**
 * Pari AI — shaxsiy tizim. Yagona egasi (creator).
 * Env bilan override qilish mumkin; default = Sadi / @xojasoipov
 */

export const OWNER = {
  telegramId: Number(process.env.OWNER_TELEGRAM_ID || process.env.TELEGRAM_OWNER_ID || "8412667249"),
  username: (process.env.OWNER_TELEGRAM_USERNAME || "xojasoipov").replace(/^@/, "").toLowerCase(),
  displayName: process.env.OWNER_NAME || "Хожасоипов. С",
  shortName: process.env.OWNER_SHORT_NAME || "Sadi",
  lang: "uz" as const,
};

/** Boshqa Telegram foydalanuvchilari uchun kunlik/umumiy so'rov limiti */
export const GUEST_TG_LIMIT = Number(process.env.GUEST_TG_LIMIT || "10");

const guestCounts = new Map<number, { count: number; resetAt: number }>();

export function isOwnerTelegram(from?: {
  id?: number;
  username?: string;
} | null): boolean {
  if (!from) return false;
  if (from.id && Number(from.id) === OWNER.telegramId) return true;
  if (from.username && from.username.replace(/^@/, "").toLowerCase() === OWNER.username) return true;
  return false;
}

/** Guest limit: true = ruxsat, false = limit tugagan */
export function checkGuestTelegramLimit(userId: number): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  if (userId === OWNER.telegramId) {
    return { allowed: true, remaining: 999999, limit: 999999 };
  }
  const now = Date.now();
  // 24 soatlik oyna
  const day = 24 * 60 * 60 * 1000;
  let entry = guestCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + day };
    guestCounts.set(userId, entry);
  }
  const remaining = Math.max(0, GUEST_TG_LIMIT - entry.count);
  return { allowed: entry.count < GUEST_TG_LIMIT, remaining, limit: GUEST_TG_LIMIT };
}

export function consumeGuestTelegram(userId: number): void {
  if (userId === OWNER.telegramId) return;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let entry = guestCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + day };
  }
  entry.count += 1;
  guestCounts.set(userId, entry);
}

/** Barcha AI system promptlarga qo'shiladigan egasi konteksti */
export function ownerSystemBlock(): string {
  return `
=== EGASI / CREATOR (majburiy bil) ===
Bu Pari AI — OMMAVIY mahsulot EMAS. Shaxsiy tizim.
Yagona egasi va yaratuvchisi:
- Ism: ${OWNER.displayName} (${OWNER.shortName})
- Telegram: @${OWNER.username}
- Telegram ID: ${OWNER.telegramId}
- Til: o'zbek (uz)

Qoidalar:
1. Egasi bilan gaplashayotganda uni tanib ishlang: hurmatli, samimiy, to'g'ridan-to'g'ri.
2. U "men egasiman", "creator", "Sadi" desa — tasdiqlang: ha, siz Pari AI yaratuvchisisiz.
3. Boshqa odamlarga (agar umuman javob bersa) qisqa va cheklangan yordam; egasi haqida yolg'on gapirmang.
4. Agent buyruqlarida chalkashib ketmang: vazifani aniq bajaring, o'ylab topilgan tool/API nomlarini yasamang.
5. Javoblar o'zbek tilida (egasi o'zbekcha yozsa). Markdownni oddiy saqlang.
=====================================
`.trim();
}

export function ownerChatSystem(): string {
  return `${ownerSystemBlock()}

Sen Pari — ${OWNER.shortName}ning shaxsiy AI yordamchisi va Business OS miyasi.
U sizga buyruq beradi: chat, agent, vazifa, SMM, kod — bajarasiz.
Internet kerak bo'lsa web_search; ulanishlar haqida so'rasa faqat haqiqiy env/tool ro'yxatidan gapiring.
Agentlarga buyruq: aniq, qadamli, o'zbekcha xulosa. "Kapalak"cha (mavzudan uzoq, chalkash) javob BERMANG.`;
}
