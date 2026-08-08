/**
 * SADIPRIME design system.
 *
 * One source for colour, elevation, radius and layout. Components should pull
 * from here rather than hard-coding hex values, so a token change lands
 * everywhere at once.
 */

/* ── Colour ───────────────────────────────────────────────────────────────── */

export const BG = "#050505";        // page
export const BG_ALT = "#0D0D0D";    // alternating band
export const SURFACE = "#121212";   // raised card
export const BORDER = "rgba(255,255,255,0.08)";
export const BORDER_STRONG = "rgba(255,255,255,0.14)";

export const GOLD = "#D6A86A";
export const GOLD_DEEP = "#B98A45";
export const SUCCESS = "#4ADE80";

export const TEXT = "#FFFFFF";
export const TEXT_DIM = "#A0A0A0";
export const TEXT_FAINT = "rgba(255,255,255,0.45)";

/**
 * Any hex colour at a given alpha — avoids scattering `${GOLD}33` string math
 * around. `gold()` below is the same thing pinned to the brand colour.
 */
export function alpha(hex: string, a: number): string {
  const clamped = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${clamped}`;
}

/** Gold at a given alpha — avoids scattering `${GOLD}33` string math around. */
export function gold(a: number): string {
  return alpha(GOLD, a);
}

/* ── Content accents ──────────────────────────────────────────────────────── */

/**
 * Gold stays the single brand/CTA colour (buttons, links, section labels) —
 * that's what makes the site feel like one studio, not a rainbow. These four
 * live ONLY on content that classifies itself (a project's category, a
 * service's domain): they give the page visual variety that actually means
 * something, instead of every card/badge repeating the same gold.
 */
export const VIOLET = "#9B87F5";   // AI / avtomatlashtirilgan mantiq
export const CYAN = "#5FC9E8";     // Telegram / real-time platforma
export const ROSE = "#E893A6";     // Branding / marketing / ijodiy ish
export const EMERALD = "#52D9A6";  // CRM / backend / infratuzilma

export type ProjectCategoryName =
  | "Web-saytlar" | "Telegram Mini App" | "AI" | "Branding" | "CRM";

/** Loyiha kategoriyasidan aksent rangini oladi — kartalar, teglar, detal sahifada. */
export const CATEGORY_ACCENT: Record<ProjectCategoryName, string> = {
  "Web-saytlar": GOLD,
  "Telegram Mini App": CYAN,
  "AI": VIOLET,
  "Branding": ROSE,
  "CRM": EMERALD,
};

/** Xizmat slug'idan aksent rangini oladi — xizmatlar sahifasidagi ikonka plitkalari. */
export const SERVICE_ACCENT: Record<string, string> = {
  "web-saytlar": GOLD,
  "telegram-mini-app": CYAN,
  "ai-yechimlar": VIOLET,
  "avtomatlashtirish": EMERALD,
  "marketing": ROSE,
  "ui-ux": ROSE,
  "chatbotlar": VIOLET,
  "crm": EMERALD,
};

/* ── Layout ───────────────────────────────────────────────────────────────── */

/** Max content width from the brief (1320px) — used as a Tailwind arbitrary value. */
export const CONTAINER = "mx-auto w-full max-w-[1320px] px-6 md:px-10";

export const RADIUS = 24;
export const RADIUS_SM = 16;

/* ── Motion ───────────────────────────────────────────────────────────────── */

/**
 * Bitta manba — butun saytdagi scroll-reveal animatsiyalari shu ikki qiymatga
 * tayanadi (motion.tsx: fadeUp, Reveal, TextReveal). Bu yerni o'zgartirsangiz
 * har bir sahifadagi kirish animatsiyasi bir vaqtda yangilanadi — "bitta
 * shablon" degani shu: sahifalar alohida-alohida emas, shu joydan tarqaladi.
 */
export const REVEAL_EASE = [0.25, 0.1, 0.25, 1] as const;
export const REVEAL_DURATION = 0.7;

/* ── Elevation ────────────────────────────────────────────────────────────── */

export const SHADOW_LUXURY = "0 24px 70px -20px rgba(0,0,0,0.8)";
export const SHADOW_GOLD = `0 20px 60px -24px ${gold(0.45)}`;

/* ── Surfaces ─────────────────────────────────────────────────────────────── */

/** Frosted panel: translucent surface + blur, the default card treatment. */
export const glass = {
  background: "rgba(18,18,18,0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS,
} as const;

/** Solid card for dense content where blur would cost more than it gives. */
export const solidCard = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS,
} as const;

export const outlineStyle = {
  border: `1px solid ${BORDER}`,
} as const;

/* ── Buttons ──────────────────────────────────────────────────────────────── */

export const goldButtonStyle = {
  background: `linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
  color: "#140F07",
  boxShadow: `0 10px 30px -12px ${gold(0.7)}`,
} as const;

/** Same treatment as goldButtonStyle but for a content accent — category filter pills. */
export function accentButtonStyle(color: string) {
  return {
    background: `linear-gradient(180deg, ${color} 0%, ${alpha(color, 0.75)} 100%)`,
    color: "#0A0A0A",
    boxShadow: `0 10px 30px -12px ${alpha(color, 0.7)}`,
  } as const;
}

export const ghostButtonStyle = {
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${BORDER}`,
  color: TEXT,
} as const;

/* ── Navigation ───────────────────────────────────────────────────────────── */

export const NAV_LINKS = [
  { label: "Bosh sahifa", href: "/portfolio" },
  { label: "Xizmatlar", href: "/portfolio/xizmatlar" },
  { label: "Portfolio", href: "/portfolio/loyihalar" },
  { label: "Jarayon", href: "/portfolio/jarayon" },
  { label: "Narxlar", href: "/portfolio/narxlar" },
  { label: "Blog", href: "/portfolio/blog" },
  { label: "Biz haqimizda", href: "/portfolio/haqida" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Kompaniya",
    links: [
      { label: "Biz haqimizda", href: "/portfolio/haqida" },
      { label: "Karyera", href: "/portfolio/karyera" },
      { label: "Blog", href: "/portfolio/blog" },
      { label: "Aloqa", href: "/portfolio/aloqa" },
    ],
  },
  {
    title: "Xizmatlar",
    links: [
      { label: "Web-saytlar", href: "/portfolio/xizmatlar" },
      { label: "Telegram Mini App", href: "/portfolio/xizmatlar" },
      { label: "AI Yechimlar", href: "/portfolio/ai" },
      { label: "Avtomatlashtirish", href: "/portfolio/xizmatlar" },
      { label: "Marketing", href: "/portfolio/xizmatlar" },
    ],
  },
  {
    title: "Portfolio",
    links: [
      { label: "Barcha loyihalar", href: "/portfolio/loyihalar" },
      { label: "Web-saytlar", href: "/portfolio/loyihalar" },
      { label: "AI loyihalar", href: "/portfolio/loyihalar" },
      { label: "Branding", href: "/portfolio/loyihalar" },
    ],
  },
  {
    title: "Resurslar",
    links: [
      { label: "FAQ", href: "/portfolio/faq" },
      { label: "Narxlar", href: "/portfolio/narxlar" },
      { label: "Maxfiylik siyosati", href: "/portfolio/faq" },
      { label: "Foydalanish shartlari", href: "/portfolio/faq" },
    ],
  },
] as const;
