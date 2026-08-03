import { NextRequest, NextResponse } from "next/server";
import { getProviders, type Provider } from "@/lib/providers";
import { log } from "@/lib/logger";
import { buildBrainContext, connectionsSummaryJson } from "@/lib/connections";
import { toolsAsOpenAIFunctionsAll, runAnyTool } from "@/lib/mcp-tools";
import { internetSearch, fetchUrl } from "@/lib/web";
import { ownerChatSystem } from "@/lib/owner";

const SYSTEM_BASE = `${ownerChatSystem()}

Sen Pari AI Brain (shaxsiy OS).
Faqat system dagi ✅/❌ ulanishlar va TOOL LAR ro'yxatidan foydalan.
list_service_orders, get_order_details kabi nomlarni O'YLAMA — ular yo'q.
O'zbek savol → o'zbek javob. Internet → web_search.
Agent/buyruqda mavzudan chiqib chalkashtirma — aniq bajar.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|mavjud/i.test(
    text
  );
}

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...(s.disconnected.length
        ? s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`)
        : ["(yo'q)"]),
      "\n## Tool lar",
      ...s.tools.map((n: string | { name: string }) =>
        typeof n === "string" ? `- \`${n}\`` : `- \`${n.name}\``
      ),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

async function autoExtra(userText: string): Promise<string> {
  const parts: string[] = [];
  const t = userText.toLowerCase();
  const urlM = userText.match(/https?:\/\/[^\s]+/i);

  if (urlM) {
    try {
      if (/email/i.test(t)) {
        parts.push(
          "[extract_emails]\n" +
            JSON.stringify(await runAnyTool("extract_emails", { url: urlM[0] })).slice(0, 3000)
        );
      } else if (/social|instagram|telegram/i.test(t)) {
        parts.push(
          "[extract_social_links]\n" +
            JSON.stringify(await runAnyTool("extract_social_links", { url: urlM[0] })).slice(0, 3000)
        );
      } else {
        const page = await fetchUrl(urlM[0]);
        parts.push(`[web_fetch] ${page.title}\n${page.text.slice(0, 3500)}`);
      }
    } catch (e) {
      parts.push(`[fetch xato] ${String(e)}`);
    }
  } else if (/internet|qidir|search|yangilik|hozir|bugun|raqobatch|crm tizim/i.test(userText)) {
    try {
      const s = await internetSearch(userText.slice(0, 200));
      parts.push(
        "[web_search]\n" +
          s.hits.map((h, i) => `${i + 1}. ${h.title}\n${h.url}\n${h.snippet}`).join("\n")
      );
    } catch (e) {
      parts.push(`[web_search xato] ${String(e)}`);
    }
  }
  return parts.join("\n\n");
}

async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const tools = toolsAsOpenAIFunctionsAll();
  const convo = [...messages];
  for (let round = 0; round < 8; round++) {
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
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`Provider ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Bo'sh javob");
    if (!msg.tool_calls?.length) return msg.content || "";
    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let result: unknown;
      try {
        result = await runAnyTool(call.function.name, JSON.parse(call.function.arguments || "{}"));
      } catch (err) {
        result = { error: (err as Error).message };
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
  }
  return "Tool limit.";
}

function textStream(text: string): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(text));
        c.close();
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
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const lastText = typeof lastUser?.content === "string" ? lastUser.content : "";

  if (isInventoryQuestion(lastText)) {
    log("info", "chat-api", "inventory short-circuit");
    return textStream(formatReport());
  }

  const live = JSON.stringify(connectionsSummaryJson(), null, 2).slice(0, 8000);
  let extra = "";
  try {
    extra = await autoExtra(lastText);
  } catch (e) {
    extra = String(e);
  }

  const baseSystem =
    (system || SYSTEM_BASE) +
    "\n\n" +
    buildBrainContext() +
    "\n\n## LIVE JSON\n" +
    live +
    (extra ? "\n\n## EXTRA\n" + extra : "");

  const toolProviders = list.filter((p) => p.supportsTools && p.key !== "dummy");
  for (const toolProvider of toolProviders) {
    try {
      const finalText = await runToolLoop(toolProvider, [
        { role: "system", content: baseSystem },
        ...messages,
      ]);
      log("info", "chat-api", `tools ${toolProvider.name} ${(Date.now() - start) / 1000}s`);
      return textStream(finalText);
    } catch (e) {
      log("warn", "chat-api", `tool-loop fail ${toolProvider.name}: ${String(e)}`);
    }
  }

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
          messages: [{ role: "system", content: baseSystem }, ...messages],
          stream: true,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) continue;

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

  return textStream("Provayder ishlamadi.\n\n" + formatReport());
}
