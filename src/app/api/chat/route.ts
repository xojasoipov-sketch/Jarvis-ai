import { NextRequest, NextResponse } from "next/server";
import { getProviders, type Provider } from "@/lib/providers";
import { log } from "@/lib/logger";
import { buildBrainContext } from "@/lib/connections";
import { toolsAsOpenAIFunctionsAll, runAnyTool } from "@/lib/mcp-tools";
import { internetSearch, fetchUrl } from "@/lib/web";

const SYSTEM_BASE = `Sen Pari AI — AI Brain.
Internet va tool lar mavjud: web_search, web_fetch, extract_emails, extract_social_links, extract_images, extract_page_text, extract_list, list_connections, mcp_list_servers, mcp_call.

Qoidalar:
1. O'zbek savol → o'zbek javob
2. Internet / yangilik / fakt → web_search yoki web_fetch ISHLAT
3. Sahifadan email/social/rasm → extract_* tool
4. MCP → mcp_list_servers keyin mcp_call
5. Taxmin qilma — tool natijasiga tayyan
6. Markdown OK`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/** When model has no tools — still gather internet/context server-side */
async function autoContext(userText: string): Promise<string> {
  const parts: string[] = [];
  const t = userText.toLowerCase();

  const wantsNet =
    /internet|qidir|search|yangilik|hozir|bugun|nima bo'ldi|who is|what is|http|www\.|sayt|website|scrape|email|extract/i.test(
      userText
    );

  const urlM = userText.match(/https?:\/\/[^\s]+/i);
  if (urlM) {
    try {
      if (/email/i.test(t)) {
        const r = await runAnyTool("extract_emails", { url: urlM[0] });
        parts.push(`\n[extract_emails]\n${JSON.stringify(r).slice(0, 3000)}`);
      } else if (/social|telegram|instagram|linkedin/i.test(t)) {
        const r = await runAnyTool("extract_social_links", { url: urlM[0] });
        parts.push(`\n[extract_social_links]\n${JSON.stringify(r).slice(0, 3000)}`);
      } else if (/rasm|image|img/i.test(t)) {
        const r = await runAnyTool("extract_images", { url: urlM[0] });
        parts.push(`\n[extract_images]\n${JSON.stringify(r).slice(0, 3000)}`);
      } else if (/list|ro'yxat|roʻyxat/i.test(t)) {
        const r = await runAnyTool("extract_list", { url: urlM[0] });
        parts.push(`\n[extract_list]\n${JSON.stringify(r).slice(0, 3000)}`);
      } else {
        const page = await fetchUrl(urlM[0]);
        parts.push(`\n[web_fetch ${page.url}]\n${page.title}\n${page.text.slice(0, 4000)}`);
      }
    } catch (e) {
      parts.push(`\n[fetch xato] ${String(e)}`);
    }
  } else if (wantsNet) {
    try {
      const s = await internetSearch(userText.slice(0, 200));
      if (s.hits.length) {
        parts.push(
          `\n[web_search backends=${s.backends.join(",")}]\n` +
            s.hits
              .map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`)
              .join("\n")
        );
      } else {
        parts.push("\n[web_search] natija topilmadi");
      }
    } catch (e) {
      parts.push(`\n[web_search xato] ${String(e)}`);
    }
  }

  if (/ulan|connect|tool|mcp|nima bor/i.test(t)) {
    try {
      const r = await runAnyTool("list_connections", {});
      parts.push(`\n[list_connections]\n${JSON.stringify(r).slice(0, 2500)}`);
    } catch {}
  }

  return parts.join("\n");
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
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Provider ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Bo'sh javob");

    if (!msg.tool_calls?.length) return msg.content || "";

    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let result: unknown;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        result = await runAnyTool(call.function.name, args);
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
  return "Tool limit. Qayta so'rang.";
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

  const brainCtx = buildBrainContext();
  let auto = "";
  try {
    auto = await autoContext(lastText);
  } catch (e) {
    auto = `[autoContext xato] ${String(e)}`;
  }

  const baseSystem =
    (system || SYSTEM_BASE) +
    "\n\n" +
    brainCtx +
    (auto ? `\n\n## SERVER TOMONIDAN YIG'ILGAN MA'LUMOT (ishlat):\n${auto}` : "");

  // 1) Native tool-calling providers
  const toolProviders = list.filter((p) => p.supportsTools && p.key !== "dummy");
  for (const toolProvider of toolProviders) {
    try {
      const convo: ChatMessage[] = [{ role: "system", content: baseSystem }, ...messages];
      const finalText = await runToolLoop(toolProvider, convo);
      log("info", "chat-api", `tools ${toolProvider.name} ${(Date.now() - start) / 1000}s`);
      return textStream(finalText);
    } catch (e) {
      log("warn", "chat-api", `tool-loop fail ${toolProvider.name}: ${String(e)}`);
    }
  }

  // 2) Stream without native tools (context already injected via autoContext)
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
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;

      log("info", "chat-api", `stream ${p.name}`);
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

  // 3) Last resort: return auto context alone
  if (auto) {
    return textStream("Internet/tool natijasi:\n" + auto);
  }

  return NextResponse.json({ error: "Barcha provayderlar ishlamadi" }, { status: 500 });
}
