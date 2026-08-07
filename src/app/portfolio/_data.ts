/** SADIPRIME public site content — single source for every page. */

/* ── Services (design 02) ─────────────────────────────────────────────────── */

export interface Service {
  slug: string;
  title: string;
  /** One-line version used on the home strip. */
  short: string;
  /** Fuller copy used on the services page. */
  desc: string;
}

export const SERVICES: Service[] = [
  {
    slug: "web-saytlar",
    title: "Web-sayt yaratish",
    short: "Zamonaviy va konversiyali veb-saytlar yaratamiz",
    desc: "Zamonaviy, tez yuklanadigan va SEO uchun optimallashtirilgan korporativ saytlar, landing sahifalar va internet do'konlar.",
  },
  {
    slug: "telegram-mini-app",
    title: "Telegram Mini App",
    short: "Telegram ichida ishlaydigan kuchli mini ilovalar",
    desc: "Telegram ichida to'liq ishlaydigan do'kon, bron qilish va xizmat ilovalari — to'lov va bot integratsiyasi bilan.",
  },
  {
    slug: "ai-yechimlar",
    title: "AI Yechimlar",
    short: "AI agentlar, chatbotlar va avtomatlashgan tizimlar",
    desc: "Biznes jarayonlaringizga moslashtirilgan AI agentlar, hujjat tahlili, ovozli yordamchi va tavsiya tizimlari.",
  },
  {
    slug: "avtomatlashtirish",
    title: "Avtomatlashtirish",
    short: "Biznes jarayonlaringizni tamomila avtomatlashtiramiz",
    desc: "Takrorlanuvchi ishlarni yo'q qilamiz: hisobotlar, xabarnomalar, integratsiyalar va ichki oqimlarni avtomatlashtirish.",
  },
  {
    slug: "marketing",
    title: "SMM & Marketing",
    short: "SMM, target, SEO va boshqa marketing xizmatlari",
    desc: "Kontent strategiyasi, target reklama, SEO va analitika — o'lchanadigan natijaga yo'naltirilgan marketing.",
  },
  {
    slug: "ui-ux",
    title: "UI/UX Dizayn",
    short: "Foydalanuvchiga qulay premium interfeyslar",
    desc: "Foydalanuvchi tadqiqotidan prototipgacha: dizayn tizimi, interfeys va brend identifikatsiyasi.",
  },
  {
    slug: "chatbotlar",
    title: "Chatbotlar",
    short: "Telegram va veb uchun aqlli chatbotlar",
    desc: "Mijozlar bilan 24/7 ishlaydigan, buyurtma qabul qiluvchi va savollarga javob beruvchi aqlli botlar.",
  },
  {
    slug: "crm",
    title: "CRM Tizimlar",
    short: "Biznesingizga moslashtirilgan boshqaruv tizimi",
    desc: "Mijozlar, bitimlar, omborlar va xodimlarni bitta joyda boshqaradigan maxsus CRM va ERP yechimlari.",
  },
];

/* ── Projects (designs 03, 04) ────────────────────────────────────────────── */

export const PROJECT_CATEGORIES = [
  "Barchasi",
  "Web-saytlar",
  "Telegram Mini App",
  "AI",
  "Branding",
  "CRM",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface Project {
  slug: string;
  title: string;
  /** Category chip shown on the card and used by the filter. */
  category: Exclude<ProjectCategory, "Barchasi">;
  tagline: string;
  summary: string;
  /** Card cover — a CSS gradient so the site ships with no external images. */
  gradient: string;
  tech: string[];
  metrics: ProjectMetric[];
  problem: string;
  solution: string;
}

export const PROJECTS: Project[] = [
  {
    slug: "dli-shop",
    title: "DLI Shop",
    category: "Telegram Mini App",
    tagline: "Telegram Mini App",
    summary: "Premium Telegram Mini App internet do'koni — katalog, savat, to'lov va admin panel.",
    gradient: "linear-gradient(150deg,#1a1410 0%,#3a2410 55%,#1a1410 100%)",
    tech: ["Next.js", "Telegram Mini Apps", "Supabase", "PostgreSQL"],
    metrics: [
      { value: "120%", label: "Konversiya o'sishi" },
      { value: "85K+", label: "Ko'rishlar" },
      { value: "99.9%", label: "Uptime" },
      { value: "45 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Mijozning do'koni faqat Instagram orqali ishlar, buyurtmalar qo'lda yozib olinar va yo'qolib ketardi. Katalogni ko'rish va to'lov qilish uchun mijoz saytdan chiqib ketishga majbur edi.",
    solution:
      "Telegram ichida to'liq ishlaydigan do'kon yaratdik: katalog, savat, to'lov va yetkazib berish. Admin panel orqali mahsulot va buyurtmalar bitta joydan boshqariladi.",
  },
  {
    slug: "sadiprime-ai",
    title: "Sadiprime AI Platform",
    category: "AI",
    tagline: "AI Platforma",
    summary: "Ko'p modelli AI platforma — suhbat, hujjat tahlili va biznes avtomatlashtirish.",
    gradient: "linear-gradient(150deg,#0b1220 0%,#12233d 55%,#0b1220 100%)",
    tech: ["Next.js", "Multi-model AI", "Supabase", "Railway"],
    metrics: [
      { value: "8x", label: "Tezroq javob" },
      { value: "40K+", label: "So'rovlar/oy" },
      { value: "99.5%", label: "Uptime" },
      { value: "60 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Jamoa har xil AI xizmatlaridan alohida foydalanardi — kontekst yo'qolar, xarajat nazoratsiz o'sardi.",
    solution:
      "Barcha modellarni bitta interfeysga birlashtirdik, uzoq muddatli xotira va tool-calling qo'shdik, provayder tugasa avtomatik keyingisiga o'tadi.",
  },
  {
    slug: "real-estate",
    title: "Real Estate Platform",
    category: "Web-saytlar",
    tagline: "Veb-sayt",
    summary: "Ko'chmas mulk platformasi — qidiruv, filtr, xarita va sotuvchi kabineti.",
    gradient: "linear-gradient(150deg,#171512 0%,#3a3226 55%,#171512 100%)",
    tech: ["Next.js", "PostgreSQL", "Mapbox", "Tailwind CSS"],
    metrics: [
      { value: "3.2x", label: "Ko'proq so'rov" },
      { value: "12K+", label: "E'lonlar" },
      { value: "1.4s", label: "Yuklanish vaqti" },
      { value: "70 kun", label: "Loyiha muddati" },
    ],
    problem:
      "E'lonlar Excel'da yuritilar, mijozlar kerakli uyni topa olmasdi — qidiruv va filtr umuman yo'q edi.",
    solution:
      "Xarita asosidagi qidiruv, kuchli filtrlar va sotuvchilar uchun kabinet qurdik. E'lonlar moderatsiyadan o'tib avtomatik chop etiladi.",
  },
  {
    slug: "ai-chat-dashboard",
    title: "AI Chat Dashboard",
    category: "AI",
    tagline: "AI",
    summary: "Mijozlar bilan suhbatlarni AI yordamida tahlil qiluvchi boshqaruv paneli.",
    gradient: "linear-gradient(150deg,#0c1013 0%,#1a2a2e 55%,#0c1013 100%)",
    tech: ["Next.js", "OpenAI", "Recharts", "Supabase"],
    metrics: [
      { value: "65%", label: "Kamroq qo'l mehnati" },
      { value: "24/7", label: "Monitoring" },
      { value: "99.8%", label: "Uptime" },
      { value: "35 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Qo'llab-quvvatlash jamoasi kuniga yuzlab suhbatni qo'lda o'qib chiqar, muammolar kech aniqlanardi.",
    solution:
      "Har bir suhbatni avtomatik tasniflovchi va kayfiyatni baholovchi panel yaratdik — muammoli holatlar darhol yuqoriga chiqadi.",
  },
  {
    slug: "smm-panel",
    title: "SMM Panel",
    category: "Telegram Mini App",
    tagline: "Telegram",
    summary: "Telegram kanallarni boshqarish, post rejalashtirish va AI kontent generatsiyasi.",
    gradient: "linear-gradient(150deg,#1a1018 0%,#33203a 55%,#1a1018 100%)",
    tech: ["Next.js", "Telegram Bot API", "AI Models", "Supabase"],
    metrics: [
      { value: "5x", label: "Tezroq kontent" },
      { value: "30+", label: "Kanallar" },
      { value: "99.9%", label: "Yetkazish" },
      { value: "28 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Bir nechta kanalga qo'lda post tashlash ko'p vaqt olardi, kontent g'oyalari doim yetishmasdi.",
    solution:
      "Kanallarni bitta paneldan boshqarish, jadval bo'yicha avtomatik chop etish va AI bilan kontent tayyorlashni qo'shdik.",
  },
  {
    slug: "e-learning",
    title: "E-learning Platform",
    category: "Web-saytlar",
    tagline: "Veb-sayt",
    summary: "Onlayn kurslar platformasi — video darslar, testlar va sertifikat.",
    gradient: "linear-gradient(150deg,#101418 0%,#1e2c3a 55%,#101418 100%)",
    tech: ["Next.js", "PostgreSQL", "Mux", "Stripe"],
    metrics: [
      { value: "2.8x", label: "Tugatish darajasi" },
      { value: "5K+", label: "O'quvchilar" },
      { value: "1.2s", label: "Yuklanish vaqti" },
      { value: "80 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Darslar Telegram kanalida tarqoq holda edi — o'quvchi qayerda qolganini bilmas, natija o'lchanmasdi.",
    solution:
      "Tuzilgan kurs dasturi, progress kuzatuvi, testlar va avtomatik sertifikat berish tizimini qurdik.",
  },
  {
    slug: "crm-dashboard",
    title: "CRM Dashboard",
    category: "CRM",
    tagline: "Tizim",
    summary: "Savdo voronkasi, mijozlar bazasi va jamoa samaradorligi bitta panelda.",
    gradient: "linear-gradient(150deg,#0c1013 0%,#16292c 55%,#0c1013 100%)",
    tech: ["Next.js", "PostgreSQL", "Recharts", "Railway"],
    metrics: [
      { value: "45%", label: "Ko'proq bitim" },
      { value: "18K+", label: "Kontaktlar" },
      { value: "99.7%", label: "Uptime" },
      { value: "55 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Savdo ma'lumotlari bir nechta jadvalga bo'lingan, rahbar real holatni faqat oy oxirida ko'rardi.",
    solution:
      "Bitimlarni bosqichma-bosqich kuzatuvchi voronka, real vaqt hisobotlari va jamoa yuklamasini ko'rsatuvchi panel yaratdik.",
  },
  {
    slug: "auto-salon",
    title: "Auto Salon",
    category: "Branding",
    tagline: "Brending",
    summary: "Avtosalon uchun brend identifikatsiyasi va prezentatsion sayt.",
    gradient: "linear-gradient(150deg,#191512 0%,#3d2f1c 55%,#191512 100%)",
    tech: ["Figma", "Next.js", "Framer Motion"],
    metrics: [
      { value: "2.1x", label: "Brend tanilishi" },
      { value: "40+", label: "Dizayn aktivi" },
      { value: "100%", label: "Mos brending" },
      { value: "30 kun", label: "Loyiha muddati" },
    ],
    problem:
      "Salonning vizual uslubi yo'q edi — har bir reklama boshqa ko'rinar, brend esda qolmasdi.",
    solution:
      "To'liq brend kitobi (logo, ranglar, tipografika) va shu tizimda qurilgan prezentatsion sayt tayyorladik.",
  },
];

/* ── Workflow (design 05) ─────────────────────────────────────────────────── */

export interface Step {
  n: string;
  title: string;
  desc: string;
}

export const STEPS: Step[] = [
  { n: "01", title: "Tahlil", desc: "Sizning biznesingizni o'rganamiz va analiz qilamiz" },
  { n: "02", title: "Reja", desc: "Eng yaxshi yechimni taklif qilib, reja tuzamiz" },
  { n: "03", title: "Ishga tushirish", desc: "Loyihani yaratib, sinovdan o'tkazamiz" },
  { n: "04", title: "Qo'llab-quvvatlash", desc: "Doimiy qo'llab-quvvatlash va rivojlantirish" },
];

/** Full 8-stage workflow shown on the dedicated Jarayon page. */
export const WORKFLOW: Step[] = [
  { n: "01", title: "Discovery", desc: "Maqsad, auditoriya va muvaffaqiyat mezonlarini aniqlaymiz" },
  { n: "02", title: "Research", desc: "Raqobatchilar va bozorni o'rganib, imkoniyatlarni topamiz" },
  { n: "03", title: "UI/UX Dizayn", desc: "Prototip va dizayn tizimini tayyorlaymiz" },
  { n: "04", title: "Development", desc: "Toza kod va zamonaviy texnologiyalar bilan quramiz" },
  { n: "05", title: "Testing", desc: "Funksional, yuklama va xavfsizlik sinovlaridan o'tkazamiz" },
  { n: "06", title: "Launch", desc: "Ishga tushiramiz va monitoringni yoqamiz" },
  { n: "07", title: "Support", desc: "Doimiy qo'llab-quvvatlash va tezkor tuzatishlar" },
  { n: "08", title: "Scaling", desc: "O'sish bo'yicha yangi imkoniyatlarni qo'shamiz" },
];

/* ── Pricing (design 06) ──────────────────────────────────────────────────── */

export interface Plan {
  name: string;
  price: string;
  note: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "$499",
    note: "Kichik biznes va startaplar uchun",
    features: ["Web-sayt (3 sahifa)", "Responsive dizayn", "2 oy qo'llab-quvvatlash", "Asosiy SEO"],
  },
  {
    name: "Business",
    price: "$999",
    note: "O'sayotgan bizneslar uchun",
    featured: true,
    features: [
      "Web-sayt (10 sahifa)",
      "Telegram Mini App",
      "Admin panel",
      "3 oy qo'llab-quvvatlash",
      "AI integratsiya",
    ],
  },
  {
    name: "Enterprise",
    price: "$1999",
    note: "Yirik loyihalar uchun",
    features: [
      "Cheksiz sahifa",
      "CRM tizimi",
      "AI yechimlar",
      "6 oy qo'llab-quvvatlash",
      "Hosting va domen",
      "Prioritet qo'llab-quvvatlash",
    ],
  },
];

/* ── Blog (design 07) ─────────────────────────────────────────────────────── */

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  featured?: boolean;
}

export const POSTS: Post[] = [
  {
    slug: "ai-kelajagi",
    title: "AI kelajagi: biznesni yangi bosqichga olib chiqadi",
    excerpt:
      "Sun'iy intellekt kichik bizneslar uchun ham qanday qilib real foyda keltirayotganini va qayerdan boshlash kerakligini ko'rib chiqamiz.",
    date: "2026-07-28",
    readMinutes: 6,
    featured: true,
  },
  {
    slug: "telegram-mini-app-nima",
    title: "Telegram Mini App nima va nega kerak?",
    excerpt: "Mini App'lar oddiy botdan nimasi bilan farq qiladi va qaysi biznesga mos keladi.",
    date: "2026-07-14",
    readMinutes: 4,
  },
  {
    slug: "smm-avtomatlashtirish",
    title: "SMM'ni qanday avtomatlashtirish mumkin?",
    excerpt: "Kontent rejasi, avtomatik chop etish va analitika — qo'lda ishlashni kamaytirish yo'llari.",
    date: "2026-06-30",
    readMinutes: 5,
  },
  {
    slug: "veb-sayt-tezligi",
    title: "Veb-sayt tezligi savdoga qanday ta'sir qiladi",
    excerpt: "Bir soniya kechikish konversiyani qancha kamaytiradi va buni qanday tuzatish mumkin.",
    date: "2026-06-12",
    readMinutes: 7,
  },
  {
    slug: "crm-tanlash",
    title: "Tayyor CRM yoki maxsus tizim: qaysi biri?",
    excerpt: "Har bir yondashuvning kuchli va zaif tomonlari, hamda tanlov mezonlari.",
    date: "2026-05-29",
    readMinutes: 6,
  },
];

/* ── AI showcase (design 08) ──────────────────────────────────────────────── */

export interface AiCapability {
  title: string;
  desc: string;
}

export const AI_CAPABILITIES: AiCapability[] = [
  { title: "Jarvis AI", desc: "Shaxsiy AI yordamchi — vazifa, eslatma va avtomatlashtirish" },
  { title: "Voice AI", desc: "Ovozni matnga va matnni tabiiy ovozga aylantirish" },
  { title: "Vision AI", desc: "Rasm va hujjatlarni tanib olish hamda tahlil qilish" },
  { title: "AI Agent", desc: "Ko'p bosqichli vazifalarni mustaqil bajaruvchi agentlar" },
  { title: "Automation", desc: "Biznes oqimlarini AI yordamida uchdan-uchgacha avtomatlashtirish" },
  { title: "RAG", desc: "O'z hujjatlaringiz asosida aniq javob beruvchi qidiruv" },
  { title: "MCP", desc: "Tashqi tizimlarni AI'ga standart protokol orqali ulash" },
  { title: "CRM AI", desc: "Mijoz ma'lumotlarini tahlil qilib, keyingi qadamni taklif qilish" },
  { title: "Chatbot AI", desc: "24/7 ishlaydigan, savol-javob va buyurtma qabul qiluvchi botlar" },
  { title: "Workflow AI", desc: "Jarayonlarni kuzatib, uzilishlarni oldindan aniqlash" },
];

/* ── About (design 09) ────────────────────────────────────────────────────── */

export const VALUES = [
  { title: "Sifat", desc: "Har bir detalga e'tibor — yuzaki emas, mustahkam yechim" },
  { title: "Innovatsiya", desc: "Yangi texnologiyalarni sinab, eng samaralisini qo'llaymiz" },
  { title: "Ishonchlilik", desc: "Kelishilgan muddat va shaffof muloqot" },
  { title: "Natija", desc: "Chiroyli emas, o'lchanadigan natija beradigan mahsulot" },
];

/* ── FAQ (design 11) ──────────────────────────────────────────────────────── */

export const FAQS = [
  {
    q: "Loyiha qancha vaqt ichida tayyor bo'ladi?",
    a: "Landing sahifa odatda 2–3 hafta, Telegram Mini App 4–6 hafta, murakkab CRM yoki AI platforma 2–3 oy. Aniq muddatni tahlil bosqichidan keyin kelishib olamiz.",
  },
  {
    q: "To'lovni qanday amalga oshiramiz?",
    a: "Odatda uch bosqichda: 40% boshlanishida, 30% dizayn tasdiqlangach, 30% topshirishda. Yirik loyihalarda oylik to'lov ham mumkin.",
  },
  {
    q: "Loyiha tugagandan keyin support bormi?",
    a: "Ha. Har bir paketga qo'llab-quvvatlash muddati kiradi (2–6 oy). Undan keyin oylik shartnoma asosida davom ettirish mumkin.",
  },
  {
    q: "Manba kodini beraszmi?",
    a: "Albatta. Loyiha topshirilgach, to'liq manba kodi va barcha kirish ma'lumotlari sizga o'tadi — hech qanday bog'liqlik qolmaydi.",
  },
  {
    q: "Hosting va domen kim tomonidan to'lanadi?",
    a: "Enterprise paketda birinchi yil biz qoplaymiz. Boshqa paketlarda hosting va domenni siz to'laysiz, biz sozlab beramiz.",
  },
  {
    q: "Mavjud saytimni yangilay olasizmi?",
    a: "Ha. Avval joriy holatni tahlil qilamiz, so'ng bosqichma-bosqich yangilash yoki noldan qayta qurish bo'yicha taklif beramiz.",
  },
];
