import { NextRequest, NextResponse } from "next/server";

const OR_KEY = process.env.OPENROUTER_API_KEY || "";
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || "";

const SYSTEM = `Sen Pari AI — Sadining shaxsiy AI yordamchisissan. Arxitektura:
- Ko'p agentli tizim (CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant)
- Internet kirish va web search imkoniyati
- Kod yozish va tushuntirish
- Biznes strategiyasi va modellashtirish
- Loyihalar yaratish va boshqarish

Qoidalar:
1. O'zbek tilida savol bo'lsa — o'zbek tilida javob ber
2. Kod so'ralsa — to'liq ishlaydigan kod yoz
3. Agar web qidiruv kerak bo'lsa — [WEB_SEARCH: <query>] formatida yoz
4. Qisqa va aniq bo'l, lekin kerakli hollarda batafsil tushuntir
5. Markdown formatidan foydalan`;

type Provider = { url: string; key: string; model: string; headers?: Record<string, string> };

function providers(): Provider[] {
  const list: Provider[] = [];
  if (OR_KEY) list.push({ url: "https://openrouter.ai/api/v1/chat/completions", key: OR_KEY, model: "google/gemini-2.0-flash-exp:free", headers: { "HTTP-Referer": "https://pari-ai.up.railway.app", "X-Title": "Pari AI" } });
  if (MISTRAL_KEY) list.push({ url: "https://api.mistral.ai/v1/chat/completions", key: MISTRAL_KEY, model: "mistral-large-latest" });
  if (GROQ_KEY) list.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_KEY, model: "llama-3.3-70b-versatile" });
  if (CEREBRAS_KEY) list.push({ url: "https://api.cerebras.ai/v1/chat/completions", key: CEREBRAS_KEY, model: "llama-3.3-70b" });
  return list;
}

async function webSearch(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(`**${data.Heading}**: ${data.AbstractText}`);
    for (const t of (data.RelatedTopics || []).slice(0, 4)) {
      if (t.Text) parts.push(`- ${t.Text}`);
    }
    return parts.length ? `\n\n🔍 **Web qidiruv natijalari (${query}):**\n${parts.join("\n")}` : "";
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const list = providers();
  if (!list.length) return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });

  // Web search kerakmi tekshir
  let searchContext = "";
  const lastMsg = messages[messages.length - 1]?.content || "";
  const needsSearch = /hozir|bugun|yangi|oxirgi|so'ngi|qidiruv|search|latest|news|2024|2025|2026/i.test(lastMsg);
  if (needsSearch) {
    const query = lastMsg.slice(0, 100);
    searchContext = await webSearch(query);
  }

  const sysMsg = searchContext ? SYSTEM + `\n\nQo'shimcha kontekst:${searchContext}` : SYSTEM;

  const body = {
    model: "",
    messages: [{ role: "system", content: sysMsg }, ...messages],
    stream: true,
  };

  for (const p of list) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
        body: JSON.stringify({ ...body, model: p.model }),
      });
      if (!res.ok) continue;

      const enc = new TextEncoder();
      return new Response(new ReadableStream({
        async start(ctrl) {
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n"); buf = lines.pop() || "";
            for (const line of lines) {
              const d = line.replace(/^data: /, "").trim();
              if (!d || d === "[DONE]") continue;
              try { const t = JSON.parse(d).choices?.[0]?.delta?.content || ""; if (t) ctrl.enqueue(enc.encode(t)); } catch {}
            }
          }
          ctrl.close();
        },
      }), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch { continue; }
  }
  return NextResponse.json({ error: "Barcha provayderlar ishlamadi" }, { status: 500 });
}
