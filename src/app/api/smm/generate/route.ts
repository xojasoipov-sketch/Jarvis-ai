import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";

const SYSTEM = `Sen professional Telegram kanal SMM mutaxassisisan.
Qoidalar:
- O'zbek tilida, jonli va tabiiy yoz
- Telegram uchun optimallashtirilgan: qisqa paragraflar, emoji-lar o'rinli
- Hashtag-lar oxirida: 3-5 ta tegishli hashtag
- Markdown ishlatma — faqat oddiy matn va emoji
- Har bir post: diqqat tortadigan bosh qism + asosiy fikr + CTA (harakat chaqiruvi)
- Uzunlik: 150-400 belgi (ideal Telegram post uzunligi)`;

export async function POST(req: NextRequest) {
  const { topic, channel_category = "general", tone = "professional", count = 3 } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "topic kerak" }, { status: 400 });
  }

  const prompt = `Mavzu: "${topic}"
Kanal kategoriyasi: ${channel_category}
Ohang: ${tone}
${count} ta turlicha Telegram post yar. Har birini --- bilan ajrat.
Faqat post matnini ber, boshqa izoh yozma.`;

  const providers = getProviders();

  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
          ...(p.headers || {}),
        },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const full = data.choices?.[0]?.message?.content || "";
      if (!full.trim()) continue;

      const posts = full
        .split(/---+/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 20)
        .slice(0, count);

      return NextResponse.json({ posts, provider: p.name });
    } catch { continue; }
  }

  return NextResponse.json({ error: "AI javob bermadi" }, { status: 500 });
}
