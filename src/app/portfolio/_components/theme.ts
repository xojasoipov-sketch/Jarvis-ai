/** SADIPRIME public site — shared design tokens and navigation data. */

export const GOLD = "#d9a95c";
export const GOLD_DIM = "#a87a4c"; // muted gold for gradients
export const BG = "#0a0a0d";
export const PANEL = "#111116";
export const BORDER = "rgba(255,255,255,0.08)";

/** Card surface used across every page section. */
export const cardStyle = {
  background: PANEL,
  border: `1px solid ${BORDER}`,
} as const;

/** Outline pill (secondary buttons, nav arrows, tags). */
export const outlineStyle = {
  border: `1px solid ${BORDER}`,
} as const;

/** Primary gold button. */
export const goldButtonStyle = {
  background: GOLD,
  color: "#1a1408",
} as const;

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
    title: "Yordam",
    links: [
      { label: "FAQ", href: "/portfolio/faq" },
      { label: "Qo'llab-quvvatlash", href: "/portfolio/aloqa" },
      { label: "Maxfiylik siyosati", href: "/portfolio/faq" },
      { label: "Foydalanish shartlari", href: "/portfolio/faq" },
    ],
  },
] as const;
