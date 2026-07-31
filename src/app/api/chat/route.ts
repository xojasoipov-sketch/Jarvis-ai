import { NextRequest, NextResponse } from "next/server";
import { toolsAsOpenAIFunctions, runTool } from "@/lib/tools";
import { getProviders, type Provider } from "@/lib/providers";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";

const SYSTEM = `Sen Pari AI — Sadining shaxsiy AI yordamchisissan. Arxitektura:
- Ko'p agentli tizim (18 ta agent: CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant, Architect, Debug, Security, Database, Designer, Legal, Testing, Finance, Sales, HR)
- Vositalar (tools): calculator, datetime, web_fetch, web_search, web_crawl,
  vault_read/write/search/list (Obsidian xotira),
  knowledge_search/knowledge_save (Supabase pgvector semantik xotira — RAG),
  create_task (vazifa yaratish),
  va propose_code_change — o'z manba koding'ga o'zgartirish taklif qilish (Pull Request orqali)
- Kod yozish va tushuntirish, biznes strategiyasi, loyihalar

Qoidalar:
1. O'zbek tilida savol bo'lsa — o'zbek tilida javob ber
2. Kerak bo'lganda vositalarni (tools) chaqir — taxmin qilmasdan haqiqiy ma'lumot ol
   - Hozirgi voqealar/faktlar uchun: web_search
   - Shaxsiy bilim bazasidan: knowledge_search (RAG)
   - Muhim ma'lumotlarni eslab qolish uchun: knowledge_save
3. Agar foydalanuvchi ilova kodini o'zgartirishni so'rasa — propose_code_change vositasidan foydalanib PR och
4. Qisqa va aniq bo'l, lekin kerakli hollarda batafsil tushuntir
5. Markdown formatidan foydalan
6. Agar foydalanuvchi vizual/interaktiv narsa so'rasa (sahifa, komponent, o'yin, grafik, animatsiya) — to'liq mustaqil HTML kodini \`\`\`html fenced blok ichida ber (inline CSS/JS, tashqi resurslarsiz). Bu avtomatik ravishda alohida preview panelda ko'rsatiladi.
7. Foydalanuvchi biror muhim ma'lumot aytsa (reja, qaror, ma'lumot) — knowledge_save bilan saqlash tavsiya qil`;

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
      signal: AbortSignal.timeout(12000),
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

async function ragSearch(query: string): Promise<string> {
  if (!dbConfigured) return "";
  try {
    const { data } = await supabase!
      .from("pari_knowledge")
      .select("title, content")
      .or(`title.ilike.%${query.slice(0, 50)}%,content.ilike.%${query.slice(0, 50)}%`)
      .limit(3);
    if (!data?.length) return "";
    const snippets = data.map(r => `[${r.title}]: ${r.content.slice(0, 300)}`).join("\n");
    return `\n\n📚 **Bilim bazasidan (RAG):**\n${snippets}`;
  } catch { return ""; }
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
  const start = Date.now();
  const { messages, system } = await req.json();
  const list = getProviders();
  if (!list.length) {
    log("error", "chat-api", "POST /api/chat — 500 — hech qanday provider key sozlanmagan");
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  const baseSystem = system || SYSTEM;

  // Prefer the tool-capable provider so the agent can actually call vault/code/web tools.
  // Only if a real key is set — skip tool loop for keyless providers like Pollinations.
  const toolProvider = list.find((p) => p.supportsTools && p.key !== "dummy");
  if (toolProvider) {
    try {
      const convo: ChatMessage[] = [{ role: "system", content: baseSystem }, ...messages];
      const finalText = await runToolLoop(toolProvider, convo);
      log("info", "chat-api", `POST /api/chat — 200 OK (${((Date.now() - start) / 1000).toFixed(1)}s) — ${toolProvider.name}/${toolProvider.model}`);
      return textStream(finalText);
    } catch {
      log("warn", "chat-api", `${toolProvider.name} tool-loop xato berdi, boshqa providerga o'tildi`);
    }
  }

  // Context enrichment for non-tool-capable providers
  const lastMsg = messages[messages.length - 1]?.content || "";
  const [ragCtx, searchCtx] = await Promise.all([
    ragSearch(lastMsg.slice(0, 100)),
    /hozir|bugun|yangi|oxirgi|so'ngi|qidiruv|search|latest|news|2024|2025|2026/i.test(lastMsg)
      ? webSearch(lastMsg.slice(0, 100))
      : Promise.resolve(""),
  ]);
  const extra = ragCtx + searchCtx;
  const sysMsg = extra ? baseSystem + `\n\nQo'shimcha kontekst:${extra}` : baseSystem;

  const body = { model: "", messages: [{ role: "system", content: sysMsg }, ...messages], stream: true };

  for (const p of list.filter((p) => !p.supportsTools)) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
        body: JSON.stringify({ ...body, model: p.model }),
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) continue;

      log("info", "chat-api", `POST /api/chat — 200 OK (${((Date.now() - start) / 1000).toFixed(1)}s) — ${p.name}/${p.model}`);
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
  log("error", "chat-api", "POST /api/chat — 500 — barcha provayderlar ishlamadi");
  return NextResponse.json({ error: "Barcha provayderlar ishlamadi" }, { status: 500 });
}
