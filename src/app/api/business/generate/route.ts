import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";
import { createIdea, MODULE_DEFS, type ModuleKey } from "@/lib/business-store";

const MODULE_PROMPTS: Record<ModuleKey, string> = {
  youtube: `Sen Faceless YouTube kanal strategi va skriptnavis mutaxassisisan.
Mavzu bo'yicha: (1) jozibador video sarlavha, (2) 60 soniyalik hook, (3) video skript tuzilishi (bo'lim-bo'lim), (4) tavsiya etilgan uzunlik va CTA ber.
O'zbek tilida, aniq va amaliy yoz.`,
  smm: `Sen SMM strategi va kontent-menejerisan.
Mavzu bo'yicha: (1) haftalik kontent-reja (7 kun, har biriga qisqa g'oya), (2) 3 ta tayyor post matni, (3) tavsiya etilgan hashtag va joylashtirish vaqti ber.
O'zbek tilida, Telegram/Instagram uchun moslashtirilgan yoz.`,
  courses: `Sen onlayn kurs dizayneri va ta'lim strategisan.
Mavzu bo'yicha: (1) kurs nomi va qisqa tavsif, (2) 5-8 modulli dastur (har biriga 2-3 dars nomi), (3) narxlash tavsiyasi, (4) marketing uchun asosiy foyda nuqtalarini ber.
O'zbek tilida, tizimli va amaliy yoz.`,
  blogging: `Sen SEO-blogger va affiliate marketing mutaxassisisan.
Mavzu bo'yicha: (1) SEO-optimallashtirilgan sarlavha, (2) maqola tuzilishi (H2 sarlavhalar ro'yxati), (3) mos affiliate mahsulot/xizmat turlari, (4) target kalit so'zlar ber.
O'zbek tilida yoz.`,
  ai_tools: `Sen raqamli mahsulot va AI-shablon biznesi strategisan.
Mavzu bo'yicha: (1) sotiladigan mahsulot g'oyasi (prompt pack, shablon, mini-tool), (2) narxlash tavsiyasi, (3) qaysi platformada sotish kerak (Gumroad/Etsy va h.k.), (4) qisqa marketing tavsifi ber.
O'zbek tilida yoz.`,
};

export async function POST(req: NextRequest) {
  const { module_key, topic } = await req.json();
  if (!module_key || !(module_key in MODULE_DEFS)) {
    return NextResponse.json({ error: "module_key noto'g'ri" }, { status: 400 });
  }
  if (!topic || typeof topic !== "string") {
    return NextResponse.json({ error: "topic kerak" }, { status: 400 });
  }

  const moduleKey = module_key as ModuleKey;
  const system = MODULE_PROMPTS[moduleKey];
  const providers = getProviders();

  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Mavzu: "${topic}"` },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (!content.trim()) continue;

      const idea = await createIdea({ module_key: moduleKey, title: topic, content, status: "draft" });
      return NextResponse.json({ idea, provider: p.name });
    } catch { continue; }
  }

  return NextResponse.json({ error: "AI javob bermadi" }, { status: 500 });
}
