/** SADIPRIME — ommaviy portfolio (mehmonlar / TG Mini App) */

export const SADIPRIME = {
  brand: "SADIPRIME",
  tagline: "Premium AI & Digital Solutions Studio",
  description:
    "Biz AI, Telegram Mini App va zamonaviy web-platformalar orqali bizneslarni raqamlashtiramiz. Har bir loyiha premium dizayn, yuqori unumdorlik va kelajakdagi o'sishni hisobga olgan holda ishlab chiqiladi.",
  email: "xojasoipov@gmail.com",
  location: "Andijan, O'zbekiston",
  telegram: "xojasoipov",
  phone: "+998 91 069 67 77",
  hero: "Biz g'oyalarni raqamli muvaffaqiyatga aylantiramiz",
};

export const DIRECTIONS = [
  { icon: "🤖", title: "AI Platformalar" },
  { icon: "📱", title: "Telegram Mini Apps" },
  { icon: "💻", title: "Premium Web Platformalar" },
  { icon: "⚙️", title: "Biznes Avtomatlashtirish" },
  { icon: "🎨", title: "Premium UI/UX" },
  { icon: "🚀", title: "Startup MVP" },
];

export const SERVICES = [
  { icon: "🌐", title: "Veb-saytlar", desc: "Zamonaviy, tez va SEO optimallashtirilgan" },
  { icon: "✈️", title: "Telegram Mini App", desc: "Telegram ichida kuchli mini ilovalar" },
  { icon: "✨", title: "AI Yechimlar", desc: "Agentlar, chatbotlar, avtomatlashtirish" },
  { icon: "🔗", title: "Avtomatlashtirish", desc: "Biznes jarayonlarini avtomatlashtirish" },
  { icon: "📊", title: "CRM & ERP", desc: "Maxsus boshqaruv tizimlari" },
  { icon: "📣", title: "Marketing", desc: "SMM, Target, SEO" },
  { icon: "🎨", title: "UI/UX Dizayn", desc: "Premium, foydalanuvchiga qulay" },
  { icon: "📱", title: "Mobil ilovalar", desc: "iOS va Android" },
];

export const PROJECTS = [
  {
    id: "dli-shop",
    title: "DLI SHOP",
    status: "Ishlab chiqilmoqda",
    type: "Telegram Mini App",
    summary: "Premium Telegram Mini App internet do'koni.",
    features: [
      "Premium mahsulot katalogi",
      "Admin Panel",
      "Buyurtma boshqaruvi",
      "To'lov integratsiyasi",
      "Telegram Login",
      "Responsive Design",
      "Zamonaviy animatsiyalar",
    ],
    tech: "Next.js • React • Telegram Mini Apps • Supabase • PostgreSQL",
  },
  {
    id: "tg-smm-ai",
    title: "TG SMM AI",
    status: "Dizayn va arxitektura",
    type: "AI Platform",
    summary: "AI yordamida SMM boshqaruv platformasi.",
    features: [
      "AI Content Planner",
      "Caption Generator",
      "Reels Generator",
      "Telegram Integration",
      "Analytics Dashboard",
      "AI Chat Assistant",
    ],
    tech: "Next.js • AI models • Telegram API",
  },
  {
    id: "pari-ai",
    title: "Pari AI",
    status: "Konsept ishlab chiqilmoqda",
    type: "AI Assistant",
    summary:
      "Shaxsiy AI yordamchi — suhbat, topshiriqlar va kundalik ishlarni avtomatlashtirish.",
    features: ["Voice AI", "AI Memory", "Task Management", "Knowledge Graph", "Automation"],
    tech: "Next.js • Multi-model AI • Supabase",
  },
  {
    id: "real-estate",
    title: "Real Estate Platform",
    status: "Portfolio",
    type: "Veb-sayt",
    summary: "Ko'chmas mulk platformasi.",
    features: ["Katalog", "Qidiruv", "Admin"],
    tech: "Next.js • Supabase",
  },
];

export const PROCESS = [
  { n: "01", title: "Tahlil", desc: "Biznes maqsadlari va ehtiyojlarini o'rganamiz." },
  { n: "02", title: "Loyiha arxitekturasi", desc: "Premium UX/UI va texnik yechim." },
  { n: "03", title: "Development", desc: "Toza kod va zamonaviy texnologiyalar." },
  { n: "04", title: "Qo'llab-quvvatlash", desc: "Deploy, monitoring, rivojlantirish." },
];

export const TECH = {
  Frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GSAP", "Three.js"],
  Backend: ["Node.js", "PostgreSQL", "Supabase", "REST API"],
  AI: ["OpenAI", "Anthropic", "Gemini", "Groq"],
  Platformalar: ["Telegram Mini Apps", "GitHub", "Vercel", "Railway"],
};


/** Telegram mehmon matnlari */
export function guestStartText(firstName: string): string {
  return (
    `Salom, *${firstName}*! 👋\n\n` +
    `*${SADIPRIME.brand}* — ${SADIPRIME.tagline}\n\n` +
    `${SADIPRIME.description}\n\n` +
    `📱 Portfolio mini-ilovani oching yoki /portfolio yozing.\n` +
    `📧 ${SADIPRIME.email}\n` +
    `📍 ${SADIPRIME.location}`
  );
}

export function portfolioTelegramSummary(): string {
  const dirs = DIRECTIONS.map((d) => `${d.icon} ${d.title}`).join("\n");
  const projs = PROJECTS.map(
    (p) => `• *${p.title}* (${p.status})\n  _${p.summary}_`
  ).join("\n\n");
  return (
    `*${SADIPRIME.brand}*\n${SADIPRIME.tagline}\n\n` +
    `*Yo'nalishlar:*\n${dirs}\n\n` +
    `*Tanlangan loyihalar:*\n\n${projs}\n\n` +
    `*Bog'lanish:*\n📧 ${SADIPRIME.email}\n📱 @${SADIPRIME.telegram}\n📍 ${SADIPRIME.location}`
  );
}
