// Fatosat — Pari AI'ning til tushunish qatlami (Natural Language Understanding)
// Foydalanuvchi oddiy so'z bilan aytsa ham, niyatini aniqlab to'g'ri yo'nalishga yuboradi

export type Intent =
  | { type: "chat" }
  | { type: "agent"; agentId: string }
  | { type: "hermes" }                    // Hermes o'zi agent tanlaydi
  | { type: "task"; title: string }
  | { type: "knowledge_save"; content: string }
  | { type: "knowledge_search"; query: string }
  | { type: "calendar"; action: "list" | "create"; title?: string }
  | { type: "files" }
  | { type: "services" }
  | { type: "navigate"; page: string };

// Matnni tozalash
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

// Kalit so'zlar bo'yicha tez yo'naltirish (AI chaqirmasdan)
export function classifyFast(text: string): Intent | null {
  const t = normalize(text);

  // --- Navigatsiya ---
  if (/\b(open|och|ko[''']t?ar|boring|bor)\b.*(agent|task|file|fayl|calendar|takvim|knowledge|bilim|analytic|analiz|settings|sozlama)/.test(t)) {
    if (/agent/.test(t)) return { type: "navigate", page: "/agents" };
    if (/task|vazifa/.test(t)) return { type: "navigate", page: "/tasks" };
    if (/file|fayl/.test(t)) return { type: "navigate", page: "/files" };
    if (/calendar|takvim/.test(t)) return { type: "navigate", page: "/calendar" };
    if (/knowledge|bilim/.test(t)) return { type: "navigate", page: "/knowledge" };
    if (/analytic|analiz/.test(t)) return { type: "navigate", page: "/analytics" };
    if (/settings|sozlama/.test(t)) return { type: "navigate", page: "/settings" };
  }

  // --- Xizmatlar / narxlar / buyurtma ---
  if (/\b(xizmat|narx|narxlar|buyurtma|sotib ol|xarid|paket|price|service|order)\b/.test(t)) {
    return { type: "services" };
  }

  // --- Vazifa yaratish ---
  if (/\b(qo[''']sh|qosh|eslatma|eslatib|reminder|todo|task|vazifa|yozib qo[''']y|yozib qoy)\b/.test(t)) {
    // Matn ajratib olish
    const match = t.match(/(?:qo[''']sh|qosh|yoz(?:ib)?(?:\s+qo[''']y)?|task|vazifa)[:\s]+(.+)/);
    const title = match?.[1]?.trim() || text.slice(0, 80);
    return { type: "task", title };
  }

  // --- Xotiraga saqlash ---
  if (/\b(esla|eslab qol|xotirada saqlа|yodla|remember|save to|knowledge[''']?ga|bilim bazasiga)\b/.test(t)) {
    return { type: "knowledge_save", content: text };
  }

  // --- Xotiradan qidirish ---
  if (/\b(qidir|search|top|izla|bilaman(mi)?|bilasanmi|eslayman(mi)?|esladingmi|xotiringda)\b/.test(t)) {
    return { type: "knowledge_search", query: text };
  }

  // --- Kod yozish ---
  if (/\b(kod|code|yoz|dastur|funksiya|function|class|script|api|html|css|python|javascript|typescript)\b/.test(t)) {
    return { type: "agent", agentId: "coder" };
  }

  // --- Tahlil ---
  if (/\b(tahlil|analiz|analyze|statistics|statistika|data|ma[''']lumot|trend|grafik)\b/.test(t)) {
    return { type: "agent", agentId: "analyst" };
  }

  // --- Kontent yozish ---
  if (/\b(maqola|blog|post|kontent|content|matn|yozishtarif|tarif|reklama|ad copy)\b/.test(t)) {
    return { type: "agent", agentId: "writer" };
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
  if (/\b(shartnoma|contract|huquq|legal|qonun|nizom|toifа)\b/.test(t)) {
    return { type: "agent", agentId: "legal" };
  }

  // --- Murakkab vazifa — Hermesga ---
  if (text.length > 80 && /\b(qil|baj|hal et|yor|yord)\b/.test(t)) {
    return { type: "hermes" };
  }

  return null; // Aniqlanmadi — AI classificationga o'tkazilsin
}

// Oddiy Uzbek so'zlarini "tekislash" — qo'pol xatolar va qisqartmalar
export function normalizeUzbek(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bqos\b/g, "qo'sh"],
    [/\byoz\b/g, "yoz"],
    [/\boch\b/g, "och"],
    [/\bochib ber\b/g, "ochib ber"],
    [/\bnima qilaman\b/g, "nima qilish kerak"],
    [/\bnecha\b/g, "nechta"],
    [/\bshu narsa\b/g, "bu"],
    [/\bqilish uchun\b/g, "uchun"],
    // Shorthand
    [/^kd$/i, "kod yozib ber"],
    [/^rsh$/i, "research qil"],
    [/^thl$/i, "tahlil qil"],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
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
      return `[Foydalanuvchi sotiladigan xizmatlar/narxlar bilan qiziqmoqda — /xizmatlar katalogini yoki Xizmatlar sahifasini taklif qil]`;
    default:
      return "";
  }
}
