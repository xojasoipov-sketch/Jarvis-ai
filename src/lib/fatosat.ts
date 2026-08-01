// Fatosat — Pari AI'ning til tushunish qatlami (Natural Language Understanding)
// Foydalanuvchi oddiy so'z bilan aytsa ham, niyatini aniqlab to'g'ri yo'nalishga yuboradi

export type Intent =
  | { type: "chat" }
  | { type: "agent"; agentId: string; workContext?: string }
  | { type: "hermes"; workContext?: string }
  | { type: "task"; title: string }
  | { type: "knowledge_save"; content: string }
  | { type: "knowledge_search"; query: string }
  | { type: "calendar"; action: "list" | "create"; title?: string }
  | { type: "files" }
  | { type: "services" }
  | { type: "navigate"; page: string };

// Xizmat turi → agent mapping
export const SERVICE_AGENT_MAP: Record<string, { agentId: string; label: string }> = {
  // AI & Automation
  "telegram_bot":       { agentId: "coder",    label: "Telegram Bot" },
  "ai_agent":           { agentId: "architect", label: "AI Agent" },
  "ai_chatbot":         { agentId: "coder",    label: "AI Chatbot" },
  "voice_ai":           { agentId: "architect", label: "Voice AI" },
  "call_center":        { agentId: "architect", label: "AI Call-Center" },
  "ai_smm_manager":     { agentId: "writer",   label: "AI SMM Manager" },
  "ai_support":         { agentId: "coder",    label: "AI Customer Support" },
  "ai_sales":           { agentId: "sales",    label: "AI Sales Manager" },
  "ai_hr":              { agentId: "hr",       label: "HR Avtomatlashtirish" },
  "ai_doc":             { agentId: "analyst",  label: "AI Hujjat Tahlili" },
  "ai_translate":       { agentId: "writer",   label: "AI Tarjimon" },
  "ai_analytics":       { agentId: "analyst",  label: "AI Analitika Dashboard" },
  "automation":         { agentId: "coder",    label: "Biznes Avtomatlashtirish" },
  "crm_integration":    { agentId: "coder",    label: "ChatGPT/Claude Integratsiya" },
  // Dev
  "crm":                { agentId: "coder",    label: "CRM Tizimi" },
  "erp":                { agentId: "architect", label: "ERP Tizimi" },
  "website":            { agentId: "coder",    label: "Veb-Sayt (Next.js)" },
  "mobile_app":         { agentId: "coder",    label: "Mobil Ilova" },
  "mini_app":           { agentId: "coder",    label: "Telegram Mini App" },
  "landing":            { agentId: "coder",    label: "Landing Page" },
  // Marketing
  "smm":                { agentId: "writer",   label: "SMM Yuritish" },
  "target_ads":         { agentId: "marketing", label: "Targetli Reklama" },
  "seo":                { agentId: "writer",   label: "SEO" },
  "google_ads":         { agentId: "marketing", label: "Google Ads" },
  "content_ig_tiktok":  { agentId: "writer",   label: "Instagram/TikTok Kontent" },
  "email_marketing":    { agentId: "writer",   label: "Email Marketing" },
  "copywriting":        { agentId: "writer",   label: "Copywriting" },
  "youtube":            { agentId: "writer",   label: "YouTube Kanal" },
  // Design & Media
  "uiux":               { agentId: "designer", label: "UI/UX Dizayn" },
  "branding":           { agentId: "designer", label: "Brending/Logo" },
  "video_edit":         { agentId: "designer", label: "Video Montaj" },
  "motion":             { agentId: "designer", label: "Motion Design" },
  "promo_video":        { agentId: "designer", label: "Reklama Roligi" },
  "ai_avatar":          { agentId: "designer", label: "AI Avatar Video" },
  "product_video":      { agentId: "designer", label: "Product Video" },
  "3d_render":          { agentId: "designer", label: "3D Render" },
  "dashboard_ui":       { agentId: "designer", label: "Dashboard UI" },
  "saas_design":        { agentId: "designer", label: "SaaS Dizayn" },
  // Consulting
  "consulting":         { agentId: "ceo",      label: "Biznes Konsultatsiya" },
  "digital_transform":  { agentId: "ceo",      label: "Digital Transformatsiya" },
  "crm_audit":          { agentId: "analyst",  label: "CRM Audit" },
  "sales_system":       { agentId: "sales",    label: "Sotuv Tizimi" },
  "franchise":          { agentId: "legal",    label: "Franchise Hujjatlari" },
  "kpi_okr":            { agentId: "analyst",  label: "KPI/OKR Tizimi" },
  "blog_seo":           { agentId: "writer",   label: "Blog + SEO Maqolalar" },
  "online_course":      { agentId: "writer",   label: "Online Kurs Yaratish" },
};

// Matnni tozalash
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

// Kalit so'zlar bo'yicha tez yo'naltirish (AI chaqirmasdan)
export function classifyFast(text: string): Intent | null {
  const t = normalize(text);

  // --- Navigatsiya ---
  if (/\b(open|och|ko[''']t?ar|bor)\b.*(agent|task|file|fayl|calendar|takvim|knowledge|bilim|analytic|analiz|settings|sozlama|xizmat|servis)/.test(t)) {
    if (/agent/.test(t)) return { type: "navigate", page: "/agents" };
    if (/task|vazifa/.test(t)) return { type: "navigate", page: "/tasks" };
    if (/file|fayl/.test(t)) return { type: "navigate", page: "/files" };
    if (/calendar|takvim/.test(t)) return { type: "navigate", page: "/calendar" };
    if (/knowledge|bilim/.test(t)) return { type: "navigate", page: "/knowledge" };
    if (/analytic|analiz/.test(t)) return { type: "navigate", page: "/analytics" };
    if (/settings|sozlama/.test(t)) return { type: "navigate", page: "/settings" };
    if (/xizmat|servis/.test(t)) return { type: "navigate", page: "/services" };
  }

  // --- Xizmatlar katalogi (faqat ko'rish niyati) ---
  if (/\b(xizmatlar(ing|im)?iz|narxlar(ing)?iz|qanday xizmat|xizmat.*ko[''']rsat|sotib ol|xarid qil|paket(lar)?ingiz)\b/.test(t)) {
    return { type: "services" };
  }

  // --- Vazifa yaratish ---
  if (/\b(qo[''']sh|qosh|eslatma|eslatib|reminder|todo|task|vazifa|yozib qo[''']y|yozib qoy)\b/.test(t)
    && !/\b(telegram|bot|crm|sayt|ilova|kod|yoz)\b/.test(t)) {
    const match = t.match(/(?:qo[''']sh|qosh|yoz(?:ib)?(?:\s+qo[''']y)?|task|vazifa)[:\s]+(.+)/);
    const title = match?.[1]?.trim() || text.slice(0, 80);
    return { type: "task", title };
  }

  // --- Xotiraga saqlash ---
  if (/\b(esla|eslab qol|yodla|remember|save to|knowledge[''']?ga|bilim bazasiga)\b/.test(t)) {
    return { type: "knowledge_save", content: text };
  }

  // --- Xotiradan qidirish ---
  if (/\b(qidir|search|top|izla|esladingmi|xotiringda)\b/.test(t)
    && !/\b(google|seo|keyword)\b/.test(t)) {
    return { type: "knowledge_search", query: text };
  }

  // ══════════════════════════════════════════════
  // ISH STOLI — XIZMAT IJROSI NIYATLARI
  // ══════════════════════════════════════════════

  // --- Telegram Bot / Mini App ---
  if (/\b(telegram\s*(bot|mini\s*app|miniapp)|tg\s*bot)\b/.test(t)) {
    const isMini = /mini/.test(t);
    const key = isMini ? "mini_app" : "telegram_bot";
    return { type: "agent", agentId: "coder", workContext: key };
  }

  // --- AI Agent / Xodim ---
  if (/\b(ai\s*(agent|xodim|operator|assistant)|agent\s*yarat|chatgpt\s*integ|claude\s*integ|openai\s*integ)\b/.test(t)) {
    return { type: "agent", agentId: "architect", workContext: "ai_agent" };
  }

  // --- Voice AI / Call-center ---
  if (/\b(voice\s*ai|ovozli\s*ai|ai\s*call|call[\s-]?center|qo[''']ng[''']iroq\s*markaz)\b/.test(t)) {
    return { type: "agent", agentId: "architect", workContext: "voice_ai" };
  }

  // --- AI Sales / Support / SMM Manager ---
  if (/\b(ai\s*sales|ai\s*sotuvchi|sotuv\s*robot)\b/.test(t))
    return { type: "agent", agentId: "sales", workContext: "ai_sales" };
  if (/\b(ai\s*(support|qo[''']llab|mijoz\s*xizmat))\b/.test(t))
    return { type: "agent", agentId: "coder", workContext: "ai_support" };
  if (/\b(ai\s*smm|smm\s*robot|smm\s*avtomat)\b/.test(t))
    return { type: "agent", agentId: "writer", workContext: "ai_smm_manager" };

  // --- AI Analitika Dashboard ---
  if (/\b(ai\s*analitika|analytics?\s*dashboard|kpi\s*dashboard|biznes\s*dashboard)\b/.test(t)) {
    return { type: "agent", agentId: "analyst", workContext: "ai_analytics" };
  }

  // --- AI Hujjat / Tarjimon ---
  if (/\b(hujjat\s*tahlil|shartnoma\s*tahlil|document\s*ai|ai\s*tarji?mon)\b/.test(t)) {
    const isTranslate = /tarji?mon/.test(t);
    return { type: "agent", agentId: isTranslate ? "writer" : "analyst",
      workContext: isTranslate ? "ai_translate" : "ai_doc" };
  }

  // --- CRM ---
  if (/\b(crm|mijozlar\s*(bazasi|tizim)|customer\s*relationship)\b/.test(t)) {
    const isAudit = /audit/.test(t);
    return { type: "agent", agentId: "coder", workContext: isAudit ? "crm_audit" : "crm" };
  }

  // --- ERP ---
  if (/\b(erp|korporativ\s*tizim|resurs\s*boshqar)\b/.test(t)) {
    return { type: "hermes", workContext: "erp" };
  }

  // --- Veb-sayt ---
  if (/\b(veb[\s-]?sayt|web[\s-]?site|next\.?js|react\s*sayt|sayt\s*yarat)\b/.test(t)) {
    const isLanding = /landing/.test(t);
    return { type: "agent", agentId: "coder", workContext: isLanding ? "landing" : "website" };
  }

  // --- Mobil ilova ---
  if (/\b(mobil\s*ilova|mobile\s*app|react\s*native|flutter|ios|android\s*ilova)\b/.test(t)) {
    return { type: "hermes", workContext: "mobile_app" };
  }

  // --- SMM / Marketing ---
  if (/\b(smm|ijtimoiy\s*tarmoq|instagram.*boshqar|tiktok.*boshqar|linkedin.*boshqar)\b/.test(t)) {
    return { type: "agent", agentId: "writer", workContext: "smm" };
  }
  if (/\b(target(li)?\s*reklama|facebook\s*ads|instagram\s*ads|tiktok\s*ads)\b/.test(t)) {
    return { type: "agent", agentId: "marketing", workContext: "target_ads" };
  }
  if (/\b(google\s*ads|google\s*reklama)\b/.test(t)) {
    return { type: "agent", agentId: "marketing", workContext: "google_ads" };
  }
  if (/\b(seo|qidiruv\s*optim|google\s*top|sayt.*top)\b/.test(t)) {
    return { type: "agent", agentId: "writer", workContext: "seo" };
  }
  if (/\b(youtube\s*kanal|youtube.*yurit|yt\s*kanal)\b/.test(t)) {
    return { type: "agent", agentId: "writer", workContext: "youtube" };
  }
  if (/\b(email\s*marketing|email\s*ketma|newsletter)\b/.test(t)) {
    return { type: "agent", agentId: "writer", workContext: "email_marketing" };
  }

  // --- Kontent yozish ---
  if (/\b(maqola|blog\s*post|seo\s*maqola|copywriting|copy\s*yoz|matn\s*yoz|caption|reklama\s*matn)\b/.test(t)) {
    const isBlog = /maqola|blog|seo/.test(t);
    return { type: "agent", agentId: "writer", workContext: isBlog ? "blog_seo" : "copywriting" };
  }
  if (/\b(online\s*kurs|kurs\s*yarat|kurs\s*skript|video\s*dars)\b/.test(t)) {
    return { type: "agent", agentId: "writer", workContext: "online_course" };
  }

  // --- UI/UX Dizayn ---
  if (/\b(ui[\s/]?ux|figma|interfeys\s*dizayn|dashboard\s*dizayn|saas\s*dizayn|mobile\s*ui)\b/.test(t)) {
    const isDash = /dashboard/.test(t);
    const isSaas = /saas/.test(t);
    return { type: "agent", agentId: "designer",
      workContext: isDash ? "dashboard_ui" : isSaas ? "saas_design" : "uiux" };
  }

  // --- Brending / Logo ---
  if (/\b(logo|brand(ing|book)|brend\s*identit|brand\s*kit)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "branding" };
  }

  // --- Video / Media ---
  if (/\b(video\s*montaj|video\s*tahrir|video\s*edit)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "video_edit" };
  }
  if (/\b(motion\s*design|animatsiya|motion\s*grafik)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "motion" };
  }
  if (/\b(reklama\s*rolik|promo\s*video|rekl.*video)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "promo_video" };
  }
  if (/\b(ai\s*avatar|avatar\s*video|heygen|synthesia)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "ai_avatar" };
  }
  if (/\b(3d\s*render|3d\s*model|vizualizatsiya)\b/.test(t)) {
    return { type: "agent", agentId: "designer", workContext: "3d_render" };
  }

  // --- Biznes konsultatsiya / Digital transformatsiya ---
  if (/\b(biznes\s*konsult|digital\s*transform|raqamlash|strategiya\s*mas)\b/.test(t)) {
    return { type: "agent", agentId: "ceo",
      workContext: /transform|raqamlash/.test(t) ? "digital_transform" : "consulting" };
  }
  if (/\b(sotuv\s*tizim|sales\s*system|sotuv\s*jarayon\s*qur)\b/.test(t)) {
    return { type: "agent", agentId: "sales", workContext: "sales_system" };
  }
  if (/\b(franchise\s*hujjat|franshiza\s*standart)\b/.test(t)) {
    return { type: "agent", agentId: "legal", workContext: "franchise" };
  }
  if (/\b(kpi|okr|maqsad\s*tizim|performance\s*tracking)\b/.test(t)) {
    return { type: "agent", agentId: "analyst", workContext: "kpi_okr" };
  }
  if (/\b(hr\s*avtomat|yollash\s*avtomat|onboarding\s*avtomat)\b/.test(t)) {
    return { type: "agent", agentId: "hr", workContext: "ai_hr" };
  }

  // --- Avtomatlashtirish (umumiy) ---
  if (/\b(avtomat(lashtir)?|n8n|make\.com|workflow|jarayon\s*avtomat)\b/.test(t)) {
    return { type: "agent", agentId: "coder", workContext: "automation" };
  }

  // --- Kod yozish (umumiy) ---
  if (/\b(kod|code|dastur|funksiya|function|class|script|api|html|css|python|javascript|typescript)\b/.test(t)) {
    return { type: "agent", agentId: "coder" };
  }

  // --- Tahlil ---
  if (/\b(tahlil|analiz|analyze|statistics|statistika|data|trend|grafik)\b/.test(t)) {
    return { type: "agent", agentId: "analyst" };
  }

  // --- DevOps ---
  if (/\b(deploy|docker|server|CI|CD|pipeline|kubernetes|infra|cloud)\b/i.test(t)) {
    return { type: "agent", agentId: "devops" };
  }

  // --- Xavfsizlik ---
  if (/\b(xavfsizlik|security|vulnerability|hack|pentest|himoya|CVE)\b/.test(t)) {
    return { type: "agent", agentId: "security" };
  }

  // --- Moliya ---
  if (/\b(pul|budget|byudjet|moliya|finance|xarajat|daromad|investitsiya|accounting)\b/.test(t)) {
    return { type: "agent", agentId: "finance" };
  }

  // --- Huquq ---
  if (/\b(shartnoma|contract|huquq|legal|qonun|nizom)\b/.test(t)) {
    return { type: "agent", agentId: "legal" };
  }

  // --- Murakkab / Hermes ---
  if (text.length > 80 && /\b(qil|baj|hal\s*et|yor|yord|tayyor|tuzib|ishlat)\b/.test(t)) {
    return { type: "hermes" };
  }

  return null;
}

// Oddiy Uzbek so'zlarini "tekislash"
export function normalizeUzbek(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bqos\b/g, "qo'sh"],
    [/\boch\b/g, "och"],
    [/\bnima qilaman\b/g, "nima qilish kerak"],
    [/\bnecha\b/g, "nechta"],
    [/\bshu narsa\b/g, "bu"],
    // Shorthand qisqartmalar
    [/^kd$/i, "kod yozib ber"],
    [/^rsh$/i, "research qil"],
    [/^thl$/i, "tahlil qil"],
    [/^tg$/i, "telegram"],
    [/^smm$/i, "smm kontent yoz"],
    [/^seo$/i, "seo maqola yoz"],
    [/^lp$/i, "landing page yarat"],
    [/^cr$/i, "crm tizimi yarat"],
    [/^ui$/i, "ui ux dizayn qil"],
  ];
  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Ish konteksti — AI ga qaysi xizmat bajarilayotganini bildiradi
export function workContextPrompt(workContext: string): string {
  const svc = SERVICE_AGENT_MAP[workContext];
  const label = svc?.label || workContext;

  const CTX: Record<string, string> = {
    telegram_bot: `Sen hozir mijoz uchun Telegram bot ishlab chiqmoqdasan.
Bot turini aniqlash uchun so'ra: maqsadi nima (buyurtma, FAQ, to'lov, xabar)?
Keyin to'liq ishlaydigan bot kodi (Python aiogram yoki Node.js telegraf) yoz.
Kerakli buyruqlar, handler'lar, inline keyboard va Webhook/polling setup bilan birga ber.`,

    mini_app: `Sen hozir Telegram Mini App ishlab chiqmoqdasan (Telegram Web App API).
Avval tushuntir: nima qilishi kerak, foydalanuvchi oqimi qanday?
Keyin React + Tailwind asosida to'liq ishlaydigann Mini App kodi yoz.
TelegramWebApp JS API dan foydalanish, to'lov (Telegram Stars), va bot integratsiyasini qo'sh.`,

    ai_agent: `Sen hozir maxsus AI agent yoki AI xodim yaratmoqdasan.
Mijozning biznesini tushun: qaysi soha, qanday vazifalar, qanday integratsiya kerak?
OpenAI function calling yoki Claude tool use asosida agent arxitekturasini loyihalash va kod yoz.`,

    voice_ai: `Sen hozir Voice AI operator yoki AI call-center yaratmoqdasan.
Texnologiya stack: OpenAI Whisper (STT) + GPT-4 + ElevenLabs/Edge TTS (TTS).
Qo'ng'iroq oqimi, skript va CRM integratsiya arxitekturasini tushuntir va kod yoz.`,

    crm: `Sen hozir CRM tizimi yaratmoqdasan.
Avval so'ra: qaysi soha, nechta foydalanuvchi, qanday integratsiyalar kerak?
Next.js + Supabase asosida: mijozlar, deal pipeline, vazifalar, hisobotlar modullarini yoz.`,

    erp: `Sen hozir korporativ ERP tizimi loyihasida yordamchi bo'lmoqdasan.
Bu murakkab loyiha — modullar: moliya, ombor, HR, sotuv, ishlab chiqarish.
Avval arxitektura va texnologiya stack ni muhokama qilamiz, keyin bosqichma-bosqich.`,

    website: `Sen hozir professional veb-sayt (Next.js 15 + Tailwind) yaratmoqdasan.
Sahifalar tuzilmasi, SEO strategiyasi va komponentlarni loyihala.
To'liq ishlaydigann kod, sitemap.xml, robots.txt va deploy konfiguratsiyasi bilan birga ber.`,

    mobile_app: `Sen hozir React Native (Expo) yoki Flutter asosida mobil ilova yaratmoqdasan.
Avval: iOS yoki Android yoki ikkalasi? Asosiy funksionallik nima?
Navigation, state management, API integratsiya va App Store/Play Store uchun konfiguratsiya.`,

    landing: `Sen hozir yuqori konvertatsiyali landing page yaratmoqdasan.
Avval: mahsulot/xizmat nima, maqsadli auditoriya kim, asosiy CTA nima?
To'liq HTML/CSS/JS kod yoz — hero, features, testimonials, CTA, form bilan birga.`,

    smm: `Sen hozir SMM strategiyasi va kontent yaratmoqdasan.
Qaysi platforma (Instagram, TikTok, LinkedIn, YouTube)?
Oylik kontent reja, post matnlari, hashtag strategiyasi va analytics yondashuvini ber.`,

    target_ads: `Sen hozir targetli reklama kampaniyasi yaratmoqdasan.
Platform (Facebook/Instagram/TikTok Ads), maqsad (trafik, lead, sotuv)?
Auditoriya segmentatsiyasi, kreativ konsept, budget taqsimlash va A/B test rejasini ber.`,

    seo: `Sen hozir SEO strategiyasi va optimallashtirishda yordamchi bo'lmoqdasan.
Sayt URL yoki soha, asosiy raqobatchilar, mavjud trafik holatini so'ra.
Texnik SEO checklisti, keyword cluster, content calendar va link building rejasini ber.`,

    google_ads: `Sen hozir Google Ads kampaniyasi yaratmoqdasan.
Maqsad (lead gen, e-commerce, brand awareness), daily budget, geografiya?
Kampaniya tuzilmasi, ad group'lar, keyword list, ad copy va bidding strategiyasini ber.`,

    blog_seo: `Sen hozir SEO-optimallashtirilgan blog maqolalar yozmoqdasan.
Mavzu va kalit so'zlarni so'ra. Har bir maqola uchun:
Sarlavha (H1, meta title), kirish, bo'limlar (H2/H3), xulosa va CTA bilan to'liq yoz.`,

    copywriting: `Sen hozir sotuv ko'paytiruvchi matnlar yozmoqdasan.
Nima uchun (landing, reklama, email, product card, social bio)?
Auditoriya, mahsulot/xizmat USP va kerakli tonni so'ra, keyin to'liq matn yoz.`,

    email_marketing: `Sen hozir email marketing ketma-ketlik yaratmoqdasan.
Maqsad (welcome, nurturing, sotuv, re-engagement)?
Subject line, preview text, to'liq email matn (HTML va plain) va ketma-ketlik oqimini ber.`,

    youtube: `Sen hozir YouTube kanal strategiyasi va kontent yozmoqdasan.
Niche, auditoriya, mavjud holat?
Kanal tuzilmasi, video kontent reja (30 video idea), skript va SEO (title, desc, tags) ni ber.`,

    uiux: `Sen hozir UI/UX dizayn bo'yicha yordamchi bo'lmoqdasan.
Mahsulot turi, auditoriya, mavjud dizayn bor yoki noldan?
User flow, wire-frame tavsifi, komponent ro'yxati va Figma tuzilmasini tushuntir.`,

    dashboard_ui: `Sen hozir analitika dashboard yoki admin panel UI dizayn qilmoqdasan.
Qanday ma'lumotlar ko'rsatiladi, foydalanuvchi kim (admin, manager)?
Layout, chart turlar, KPI tile'lar, navigation tuzilmasi va dark/light mode ni loyihala.`,

    branding: `Sen hozir brend identifikatsiya (logo + brandbook) yaratmoqdasan.
Kompaniya nomi, soha, maqsadli auditoriya, mavjud stilistika bor yoki noldan?
Naming tavsiyasi, rang palitasi, tipografiya, logo konsepti va brandbook tuzilmasini ber.`,

    video_edit: `Sen hozir video montaj va tahrirlash uchun ko'rsatmalar bermoqdasan.
Video turi (reklama, YouTube, TikTok, korporativ), mavjud material bor yoki yo'q?
Storyboard, montaj ketma-ketlik, color grading yo'nalishi va texnik spetsifikatsiya ber.`,

    motion: `Sen hozir motion design va animatsiya konsepti yaratmoqdasan.
Logo animatsiya, banner, UI animatsiya yoki promo video?
Konsept tavsifi, vaqt xaritasi, After Effects yoki Rive bo'yicha ko'rsatmalar ber.`,

    promo_video: `Sen hozir reklama roligi skripti va storyboard yaratmoqdasan.
Mahsulot/xizmat, target auditoriya, platforma va uzunlik (15s/30s/60s)?
To'liq skript: shot-by-shot storyboard, dialog, ovoz yo'nalishi va CTA bilan ber.`,

    ai_avatar: `Sen hozir AI avatar video yaratish bo'yicha ko'rsatmalar bermoqdasan.
Platforma (HeyGen, Synthesia, D-ID) va video maqsadi (kurs, reklama, tarqatma)?
Skript, avatar tanlash mezonlari, background va export formatini tushuntir.`,

    online_course: `Sen hozir online kurs yaratishda yordamchi bo'lmoqdasan.
Kurs mavzusi, maqsadli o'quvchi, ko'nikmalar darajasi?
Kurs dasturi (curriculum), dars tuzilmasi, learning outcomes va platform tavsiyasini ber.`,

    consulting: `Sen hozir biznes konsultatsiya o'tkazmoqdasan.
Kompaniya haqida: soha, o'lcham, asosiy muammo yoki maqsad?
SWOT tahlili, strategik tavsiyalar va 90 kunlik yo'l xaritasi bilan javob ber.`,

    digital_transform: `Sen hozir digital transformatsiya jarayonida yordamchi bo'lmoqdasan.
Kompaniya hozirgi holatini tushun: qanday jarayonlar, qanday texnologiyalar ishlatilmoqda?
Digital transformation roadmap, tool stack tavsiyasi va ROI hisob-kitobini ber.`,

    sales_system: `Sen hozir sotuv tizimi qurishda yordamchi bo'lmoqdasan.
Sotuv jarayonini so'ra: lead qayerdan keladi, qanday qayta ishlanadi, CRM bormi?
To'liq sotuv funnel, skript, CRM setup va KPI tizimini loyihala.`,

    franchise: `Sen hozir franchise tizimi va hujjatlarni tayyorlashda yordamchi bo'lmoqdasan.
Biznes modeli, mavjud filiallar, standartlashtirish darajasi?
Franchise paket tuzilmasi, Operations Manual, shartnoma shabloni tavsiyasi va jarayon roadmap.`,

    kpi_okr: `Sen hozir KPI va OKR tizimini qurishda yordamchi bo'lmoqdasan.
Kompaniya maqsadlari, departamentlar va o'lchash imkoniyatlari?
Company-level OKR, departament KPI'lari, tracking tizimi va review jarayonini loyihala.`,

    ai_hr: `Sen hozir HR jarayonlarini avtomatlashtirishda yordamchi bo'lmoqdasan.
Qaysi jarayonlar: yollash, onboarding, maosh, performance yoki barchasi?
HR automation stack, workflow diagrammasi va integratsiya rejasini ber.`,

    automation: `Sen hozir biznes jarayonlarini avtomatlashtirishda yordamchi bo'lmoqdasan.
Qaysi jarayonni avtomatlashtirish kerak? Hozir qanday qo'lda bajarilmoqda?
n8n yoki Make.com workflow diagram, trigger-action ketma-ketlik va integratsiya rejasini ber.`,

    ai_analytics: `Sen hozir AI analitika dashboard yaratmoqdasan.
Qanday ma'lumotlar: sotuv, trafik, moliya, operatsion?
Dashboard arxitekturasi, KPI'lar ro'yxati, vizualizatsiya turlari va real-time update strategiyasini ber.`,

    crm_audit: `Sen hozir CRM audit o'tkazmoqdasan.
Qaysi CRM ishlatilmoqda, asosiy muammolar, foydalanuvchi soni?
Audit metodologiyasi, tekshirish ro'yxati va optimallashtirish tavsiyalarini ber.`,

    ai_doc: `Sen hozir AI hujjat tahlili tizimini yaratmoqdasan.
Hujjat turi (shartnoma, hisobot, PDF, scanned)?
OCR + AI pipeline arxitekturasi, ma'lumot ajratish sxemasi va integratsiya kodini ber.`,

    ai_translate: `Sen hozir AI tarjima xizmati/tizimi yaratmoqdasan.
Til juftlari, hujjat turlari va kerakli sifat darajasi?
Texnik tarjima uchun prompt engineering, glossary boshqaruvi va batch processing yondashuvini ber.`,

    crm_integration: `Sen hozir ChatGPT/Claude/Gemini ni mavjud tizimga integratsiya qilmoqdasan.
Qaysi tizimga ulash kerak (CRM, Telegram, 1C, sayt)?
API integratsiya kodi, prompt engineering strategiyasi va xarajat optimallashtirish tavsiyasini ber.`,

    ai_sales: `Sen hozir AI sales manager (sotuv roboti) yaratmoqdasan.
Sotuv kanali (Telegram, email, phone), mahsulot/xizmat nima?
Lead qualification skripti, follow-up workflow, CRM integratsiya va konversiya strategiyasini ber.`,

    ai_support: `Sen hozir AI customer support tizimini yaratmoqdasan.
Qaysi kanallar (Telegram, WhatsApp, sayt chat, email)?
Chatbot oqimi, FAQ bazasi, eskalatsiya tizimi va omnichannel integratsiya arxitekturasini ber.`,

    product_video: `Sen hozir mahsulot demo video uchun skript va storyboard yaratmoqdasan.
Mahsulot nima, kimga ko'rsatiladi, qayerda ishlatiladi?
To'liq storyboard, voiceover skript va grafik elementlar tavsifini ber.`,

    "3d_render": `Sen hozir 3D vizualizatsiya va render loyihasi bo'yicha yordamchi bo'lmoqdasan.
Ob'ekt turi (mahsulot, arxitektura, interior), kerakli kayfiyat?
Texnik brifing, software tavsiyasi, lighting setup va render parametrlari bo'yicha ko'rsatmalar ber.`,

    saas_design: `Sen hozir SaaS mahsulot dizayn sistemasini yaratmoqdasan.
Mahsulot nima, core user journey, asosiy screen'lar?
Design system (token, component, pattern), onboarding flow va core screen'lar arxitekturasini loyihala.`,

    youtube_channel: `Sen hozir YouTube kanal strategiyasi va yuritishda yordamchi bo'lmoqdasan.
Kanal niche, maqsadli auditoriya, hozirgi holat?
30 ta video idea, har bir video uchun SEO title/desc/tags va thumbnail brief ber.`,

    content_ig_tiktok: `Sen hozir Instagram va TikTok uchun kontent yaratmoqdasan.
Brend/shaxs, soha, maqsad (followers, leads, sotuv)?
Oylik kontent reja, 10 ta post/reel skripti, hashtag strategiyasi va posting schedule ber.`,

    email_mkt: `Sen hozir email marketing kampaniyasi yaratmoqdasan.
Maqsad, platformа (Mailchimp, SendGrid, Resend), subscriber bazasi?
Ketma-ketlik map, har bir email uchun subject + preview + to'liq matn ber.`,
  };

  const prompt = CTX[workContext] || `Sen hozir "${label}" xizmati bajarmoqdasan. Mijoz ehtiyojini aniqlash uchun savol ber, keyin professional darajada yordamla.`;
  return `[ISH KONTEKSTI: ${label}]\n${prompt}`;
}

// Intent metadatasini chat kontekstiga qo'shish uchun
export function intentToContext(intent: Intent): string {
  switch (intent.type) {
    case "task":
      return `[Foydalanuvchi vazifa qo'shmoqchi: "${intent.title}"]`;
    case "knowledge_save":
      return `[Foydalanuvchi bu ma'lumotni xotiraga saqlashni xohlaydi]`;
    case "knowledge_search":
      return `[Foydalanuvchi bilim bazasidan qidirmoqchi: "${intent.query}"]`;
    case "calendar":
      return `[Foydalanuvchi kalendardan foydalanmoqchi]`;
    case "services":
      return `[Foydalanuvchi xizmatlar katalogi bilan qiziqmoqda]`;
    case "agent":
      if (intent.workContext) return workContextPrompt(intent.workContext);
      return `[Agent: ${intent.agentId}]`;
    case "hermes":
      if (intent.workContext) return workContextPrompt(intent.workContext);
      return "";
    default:
      return "";
  }
}
