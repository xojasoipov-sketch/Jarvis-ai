import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pari-ai-v2-production.up.railway.app";

const SYSTEM = `Sen professional Telegram kanal SMM mutaxassisisan.
Qoidalar:
- O'zbek tilida, jonli va tabiiy yoz
- Telegram uchun optimallashtirilgan matn: qisqa paragraflar, emoji-lar oqilona
- Hashtag-lar oxirida: 3-5 ta tegishli hashtag
- Markdown ishlatma — faqat oddiy matn va emoji
- Har bir post: diqqat tortadigan sarlavha + asosiy fikr + CTA (call-to-action)
- Uzunlik: 150-400 belgi (ideal Telegram post)`;

export async function POST(req: NextRequest) {
  const { topic, channel_category = "general", tone = "professional", count = 3 } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "topic kerak" }, { status: 400 });
  }

  const prompt = `Mavzu: "${topic}"
Kanal kategoriyasi: ${channel_category}
Ohang: ${tone}
Iltimos, ${count} ta turlicha Telegram post yar. Har birini --- bilan ajrat.
Faqat post matnini ber, boshqa izoh yozma.`;

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        system: SYSTEM,
      }),
    });

    if (!res.ok) throw new Error("AI xato berdi");

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += dec.decode(value);
    }

    const posts = full
      .split(/---+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
