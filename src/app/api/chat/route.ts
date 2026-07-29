import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "";

const SYSTEM_PROMPT = `Sen Pari AI — foydalanuvchining shaxsiy AI yordamchisissan.
Seni Sadi yaratgan. Sen quyidagilarni bajara olasan:
- Internet orqali ma'lumot izlash va tahlil qilish
- Kod yozish va tushuntirish (Python, JS, va boshqa tillar)
- Biznes strategiyasini ishlab chiqish va modellashtirish
- Loyihalarni rejalashtirish va yaratish
- Ma'lumotlarni tahlil qilish va hisobotlar tuzish
- Avtomatlashtirish va tizimlashtirish
- Ijodiy mazmun yaratish

Har doim aniq, foydali va ishonchli bo'l. O'zbek tilida yozilgan savollarga o'zbek tilida javob ber.`;

type Provider = {
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
};

function getProviders(): Provider[] {
  const list: Provider[] = [];

  if (OPENROUTER_API_KEY) {
    list.push({
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: OPENROUTER_API_KEY,
      model: "google/gemini-2.0-flash-exp:free",
      headers: {
        "HTTP-Referer": "https://pari-ai.up.railway.app",
        "X-Title": "Pari AI",
      },
    });
  }
  if (MISTRAL_API_KEY) {
    list.push({
      url: "https://api.mistral.ai/v1/chat/completions",
      key: MISTRAL_API_KEY,
      model: "mistral-large-latest",
    });
  }
  if (GROQ_API_KEY) {
    list.push({
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
    });
  }
  if (CEREBRAS_API_KEY) {
    list.push({
      url: "https://api.cerebras.ai/v1/chat/completions",
      key: CEREBRAS_API_KEY,
      model: "llama-3.3-70b",
    });
  }
  return list;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const providers = getProviders();
  if (providers.length === 0) {
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  const body = {
    model: "",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    stream: true,
  };

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.key}`,
          ...provider.headers,
        },
        body: JSON.stringify({ ...body, model: provider.model }),
      });

      if (!res.ok) continue;

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const data = line.replace(/^data: /, "").trim();
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content || "";
                if (text) controller.enqueue(encoder.encode(text));
              } catch {}
            }
          }
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Barcha provayderlar ishlamadi" }, { status: 500 });
}
