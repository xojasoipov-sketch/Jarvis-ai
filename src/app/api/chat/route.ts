import { NextRequest, NextResponse } from "next/server";
import { toolsAsOpenAIFunctions, runTool } from "@/lib/tools";

const OR_KEY = process.env.OPENROUTER_API_KEY || "";
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || "";

const SYSTEM = `Sen Pari AI — Sadining shaxsiy AI yordamchisissan. Arxitektura:
- Ko'p agentli tizim (CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant)
- Vositalar (tools): calculator, datetime, web_fetch, vault_read/write/search/list (shaxsiy xotira),
  va propose_code_change — o'z manba koding'ga o'zgartirish taklif qilish (Pull Request orqali, hech qachon to'g'ridan-to'g'ri emas)
- Kod yozish va tushuntirish, biznes strategiyasi, loyihalar

Qoidalar:
1. O'zbek tilida savol bo'lsa — o'zbek tilida javob ber
2. Kerak bo'lganda vositalarni (tools) chaqir — taxmin qilmasdan haqiqiy ma'lumot ol
3. Agar foydalanuvchi ilova kodini o'zgartirishni so'rasa — propose_code_change vositasidan foydalanib PR och, natijada PR havolasini ber
4. Qisqa va aniq bo'l, lekin kerakli hollarda batafsil tushuntir
5. Markdown formatidan foydalan`;

type Provider = { url: string; key: string; model: string; headers?: Record<string, string>; supportsTools: boolean };

function providers(): Provider[] {
  const list: Provider[] = [];
  if (GROQ_KEY) list.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_KEY, model: "llama-3.3-70b-versatile", supportsTools: true });
  if (OR_KEY) list.push({ url: "https://openrouter.ai/api/v1/chat/completions", key: OR_KEY, model: "google/gemini-2.0-flash-exp:free", headers: { "HTTP-Referer": "https://pari-ai.up.railway.app", "X-Title": "Pari AI" }, supportsTools: false });
  if (MISTRAL_KEY) list.push({ url: "https://api.mistral.ai/v1/chat/completions", key: MISTRAL_KEY, model: "mistral-large-latest", supportsTools: false });
  if (CEREBRAS_KEY) list.push({ url: "https://api.cerebras.ai/v1/chat/completions", key: CEREBRAS_KEY, model: "llama-3.3-70b", supportsTools: false });
  return list;
}

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

// Run a real function-calling loop against a tool-capable provider (Groq).
// Returns the final assistant text once the model stops calling tools.
async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const tools = toolsAsOpenAIFunctions();
  const convo = [...messages];

  for (let i = 0; i < 4; i++) {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({ model: provider.model, messages: convo, tools, tool_choice: "auto", stream: false }),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Bo'sh javob");

    if (!msg.tool_calls?.length) {
      return msg.content || "";
    }

    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let result: unknown;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        result = await runTool(call.function.name, args);
      } catch (err) {
        result = { error: (err as Error).message };
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return "Kechirasiz, vositalar bilan ishlashda cheklovga yetdim. Qaytadan aniqroq so'rang.";
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

function textStream(text: string): Response {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(enc.encode(text));
      ctrl.close();
    },
  }), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json();
  const list = providers();
  if (!list.length) return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });

  const baseSystem = system || SYSTEM;

  // Prefer the tool-capable provider so the agent can actually call vault/code/web tools.
  const toolProvider = list.find((p) => p.supportsTools);
  if (toolProvider) {
    try {
      const convo: ChatMessage[] = [{ role: "system", content: baseSystem }, ...messages];
      const finalText = await runToolLoop(toolProvider, convo);
      return textStream(finalText);
    } catch {
      // fall through to plain streaming providers below
    }
  }

  // Web search heuristic kept for non-tool-capable providers
  let searchContext = "";
  const lastMsg = messages[messages.length - 1]?.content || "";
  const needsSearch = /hozir|bugun|yangi|oxirgi|so'ngi|qidiruv|search|latest|news|2024|2025|2026/i.test(lastMsg);
  if (needsSearch) searchContext = await webSearch(lastMsg.slice(0, 100));
  const sysMsg = searchContext ? baseSystem + `\n\nQo'shimcha kontekst:${searchContext}` : baseSystem;

  const body = { model: "", messages: [{ role: "system", content: sysMsg }, ...messages], stream: true };

  for (const p of list.filter((p) => !p.supportsTools)) {
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
