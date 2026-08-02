import { NextRequest, NextResponse } from "next/server";
import { getProviders, type Provider } from "@/lib/providers";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";
import { buildBrainContext } from "@/lib/connections";
import { toolsAsOpenAIFunctionsAll, runAnyTool } from "@/lib/mcp-tools";

const SYSTEM_BASE = `Sen Pari AI — Sadining AI Business Factory OS miyasi (AI Brain).

Vazifang: foydalanuvchiga yordam berish va MAVJUD tool/ulanishlardan foydalanish.

Qoidalar:
1. O'zbek tilida savol → o'zbek tilida javob
2. "Nima ulangan?", "qanday tool bor?", "Supabase ishlayaptimi?" → list_connections tool chaqir
3. Kerak bo'lganda tool chaqir — taxmin qilma
4. Ulanmagan xizmatni ishlatma yoki "bor" deb aytma
5. Qisqa, aniq; Markdown OK
6. Vizual/HTML so'ralsa — \`\`\`html fenced blok
7. Muhim ma'lumot → knowledge_save (Supabase ulangan bo'lsa)`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const tools = toolsAsOpenAIFunctionsAll();
  const convo = [...messages];

  for (let i = 0; i < 6; i++) {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...(provider.headers || {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages: convo,
        tools,
        tool_choice: "auto",
        stream: false,
      }),
      signal: AbortSignal.timeout(25000),
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
        result = await runAnyTool(call.function.name, args);
      } catch (err) {
        result = { error: (err as Error).message };
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return "Vositalar bilan ishlashda cheklov. Aniqroq so'rang yoki list_connections bilan holatni tekshiring.";
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
    const snippets = data.map((r) => `[${r.title}]: ${r.content.slice(0, 300)}`).join("\n");
    return `\n\n📚 Bilim bazasi:\n${snippets}`;
  } catch {
    return "";
  }
}

async function webSearch(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(`**${data.Heading}**: ${data.AbstractText}`);
    for (const t of (data.RelatedTopics || []).slice(0, 4)) {
      if (t.Text) parts.push(`- ${t.Text}`);
    }
    return parts.length ? `\n\n🔍 Web:\n${parts.join("\n")}` : "";
  } catch {
    return "";
  }
}

function textStream(text: string): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(enc.encode(text));
        ctrl.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { messages, system } = await req.json();
  const list = getProviders();
  if (!list.length) {
    log("error", "chat-api", "hech qanday provider yo'q");
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  // Dynamic brain context every request
  const brainCtx = buildBrainContext();
  const baseSystem = (system || SYSTEM_BASE) + "\n\n" + brainCtx;

  const toolProvider = list.find((p) => p.supportsTools && p.key !== "dummy");
  if (toolProvider) {
    try {
      const convo: ChatMessage[] = [{ role: "system", content: baseSystem }, ...messages];
      const finalText = await runToolLoop(toolProvider, convo);
      log(
        "info",
        "chat-api",
        `OK ${(Date.now() - start) / 1000}s — ${toolProvider.name}/${toolProvider.model} tools`
      );
      return textStream(finalText);
    } catch (e) {
      log("warn", "chat-api", `${toolProvider.name} tool-loop xato: ${String(e)}`);
    }
  }

  // Fallback: non-tool providers + lightweight RAG/search inject
  const lastMsg = messages[messages.length - 1]?.content || "";
  const [ragCtx, searchCtx] = await Promise.all([
    ragSearch(lastMsg.slice(0, 100)),
    /hozir|bugun|yangi|oxirgi|qidiruv|search|latest|news|2025|2026/i.test(lastMsg)
      ? webSearch(lastMsg.slice(0, 100))
      : Promise.resolve(""),
  ]);
  const extra = ragCtx + searchCtx;
  const sysMsg = extra ? baseSystem + `\n\nQo'shimcha:${extra}` : baseSystem;

  for (const p of list) {
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
          messages: [{ role: "system", content: sysMsg }, ...messages],
          stream: true,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;

      log("info", "chat-api", `OK stream — ${p.name}/${p.model}`);
      const enc = new TextEncoder();
      return new Response(
        new ReadableStream({
          async start(ctrl) {
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
                const d = line.replace(/^data: /, "").trim();
                if (!d || d === "[DONE]") continue;
                try {
                  const t = JSON.parse(d).choices?.[0]?.delta?.content || "";
                  if (t) ctrl.enqueue(enc.encode(t));
                } catch {}
              }
            }
            ctrl.close();
          },
        }),
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    } catch {
      continue;
    }
  }

  log("error", "chat-api", "barcha provayderlar ishlamadi");
  return NextResponse.json({ error: "Barcha provayderlar ishlamadi" }, { status: 500 });
}
