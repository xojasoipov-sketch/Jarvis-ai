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

/* Loyihalar endi Supabase'da (pari_portfolio_projects) va admin paneldan
   boshqariladi — @/lib/portfolio-store ga qarang. */

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
  /** Narx raqami emas — har loyiha bo'yicha alohida hisoblanadi. */
  note: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: "Starter",
    note: "Kichik biznes va startaplar uchun",
    features: ["Web-sayt (3 sahifa)", "Responsive dizayn", "2 oy qo'llab-quvvatlash", "Asosiy SEO"],
  },
  {
    name: "Business",
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
  /** Supabase Storage'dagi mavzuga mos abstrakt grafika. Bo'lmasa kartada gradient qoladi. */
  cover?: string;
}

const MEDIA = "https://tomkxsdkerpbvlumubbg.supabase.co/storage/v1/object/public/portfolio-media/blog";

export const POSTS: Post[] = [
  {
    slug: "ai-kelajagi",
    title: "AI kelajagi: biznesni yangi bosqichga olib chiqadi",
    excerpt:
      "Sun'iy intellekt kichik bizneslar uchun ham qanday qilib real foyda keltirayotganini va qayerdan boshlash kerakligini ko'rib chiqamiz.",
    date: "2026-07-28",
    readMinutes: 6,
    featured: true,
    cover: `${MEDIA}/ai-kelajagi.png`,
  },
  {
    slug: "telegram-mini-app-nima",
    title: "Telegram Mini App nima va nega kerak?",
    excerpt: "Mini App'lar oddiy botdan nimasi bilan farq qiladi va qaysi biznesga mos keladi.",
    date: "2026-07-14",
    readMinutes: 4,
    cover: `${MEDIA}/telegram-mini-app-nima.png`,
  },
  {
    slug: "smm-avtomatlashtirish",
    title: "SMM'ni qanday avtomatlashtirish mumkin?",
    excerpt: "Kontent rejasi, avtomatik chop etish va analitika — qo'lda ishlashni kamaytirish yo'llari.",
    date: "2026-06-30",
    readMinutes: 5,
    cover: `${MEDIA}/smm-avtomatlashtirish.png`,
  },
  {
    slug: "veb-sayt-tezligi",
    title: "Veb-sayt tezligi savdoga qanday ta'sir qiladi",
    excerpt: "Bir soniya kechikish konversiyani qancha kamaytiradi va buni qanday tuzatish mumkin.",
    date: "2026-06-12",
    readMinutes: 7,
    cover: `${MEDIA}/veb-sayt-tezligi.png`,
  },
  {
    slug: "crm-tanlash",
    title: "Tayyor CRM yoki maxsus tizim: qaysi biri?",
    excerpt: "Har bir yondashuvning kuchli va zaif tomonlari, hamda tanlov mezonlari.",
    date: "2026-05-29",
    readMinutes: 6,
    // Canva kvotasi tugagani sababli hozircha rasm yo'q — gradient qoladi.
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
