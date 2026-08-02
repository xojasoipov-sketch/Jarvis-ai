import { NextRequest, NextResponse } from "next/server";
import { getProviders, type Provider } from "@/lib/providers";
import { log } from "@/lib/logger";
import { buildBrainContext, formatConnectionsReport, connectionsSummaryJson } from "@/lib/connections";
import { toolsAsOpenAIFunctionsAll, runAnyTool } from "@/lib/mcp-tools";
import { internetSearch, fetchUrl } from "@/lib/web";

const SYSTEM_BASE = `Sen Pari AI Brain.
QOIDALAR (majburiy):
1. Faqat system dagi "ULANGBAN" va "TOOL LAR" ro'yxatidan foydalan.
2. list_service_orders, get_order_details kabi NOMALUM toollarni O'YLAMA — ular yo'q.
3. "Nima ulangan?" → faqat system dagi ✅/❌ ro'yxatni qaytar.
4. Internet kerak → web_search. URL berilsa → web_fetch yoki extract_*.
5. O'zbek savol → o'zbek javob. Markdown OK.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|nima connect|qanday tool|qaysi tool|ulangan|connected|connections|list_connections|nima bor|qanday funksiya|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes/i.test(
    text
  );
}

async function autoContext(userText: string): Promise<string> {
  const parts: string[] = [];
  // Always attach live inventory (short)
  try {
    const inv = connectionsSummaryJson();
    parts.push(
      "[LIVE CONNECTIONS]\n" +
        inv.connected.map((c) => `✅ ${c.name}: ${c.detail}`).join("\n") +
        "\n" +
        inv.disconnected.map((c) => `❌ ${c.name}: ${c.detail}`).join("\n") +
        "\n[TOOLS] " +
        inv.tools.join(", ")
    );
  } catch {}

  const t = userText.toLowerCase();
  const urlM = userText.match(/https?:\/\/[^\s]+/i);

  if (urlM) {
    try {
      if (/email/i.test(t)) {
        parts.push("[extract_emails]\n" + JSON.stringify(await runAnyTool("extract_emails", { url: urlM[0] })).slice(0, 3000));
      } else if (/social|telegram|instagram/i.test(t)) {
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
  } else if (/internet|qidir|search|yangilik|hozir|bugun|nima bo|raqobatch|crm tizim/i.test(userText)) {
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

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|nima connect|qanday tool|qaysi tool|ulangan|connected|connections|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt/i.test(
    text
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

  // Inventory questions → pure report, no LLM fantasy
  if (isInventoryQuestion(lastText)) {
    log("info", "chat-api", "inventory short-circuit");
    return textStream(formatConnectionsReportSafe());
  }

  const brainCtx = buildBrainContext();
  let auto = "";
  try {
    // Always inject live connections snapshot
    auto = JSON.stringify(connectionsSummaryJson(), null, 2).slice(0, 4000);
    auto += "\n" + (await autoExtra(lastText));
  } catch (e) {
    auto = String(e);
  }

  const baseSystem =
    (system || SYSTEM_BASE) +
    "\n\n" +
    brainCtx +
    `\n\n## LIVE JSON:\n${auto}`;

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

  return textStream(
    "Provayder javob bermadi. Holat:\n\n" +
      formatConnectionsReportSafe() +
      (auto ? "\n\n" + auto : "")
  );
}

function formatConnectionsReportSafe(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (server)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((name: string) => `- \`${name}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

async function autoContext(userText: string): Promise<string> {
  const parts: string[] = [];
  // Always full inventory
  parts.push("[LIVE]\n" + JSON.stringify(connectionsSummaryJson(), null, 2).slice(0, 5000));

  const t = userText.toLowerCase();
  const urlM = userText.match(/https?:\/\/[^\s]+/i);
  if (urlM) {
    try {
      if (/email/i.test(t)) {
        parts.push(JSON.stringify(await runAnyTool("extract_emails", { url: urlM[0] })).slice(0, 3000));
      } else {
        const page = await fetchUrl(urlM[0]);
        parts.push(`[web_fetch] ${page.title}\n${page.text.slice(0, 3000)}`);
      }
    } catch (e) {
      parts.push(String(e));
    }
  } else if (/internet|qidir|search|yangilik|hozir|bugun|crm tizim|raqobatch/i.test(userText)) {
    try {
      const s = await internetSearch(userText.slice(0, 200));
      parts.push(
        "[web_search]\n" +
          s.hits.map((h, i) => `${i + 1}. ${h.title}\n${h.url}\n${h.snippet}`).join("\n")
      );
    } catch (e) {
      parts.push(String(e));
    }
  }
  return parts.join("\n\n");
}

const SYSTEM_BASE = `Sen Pari AI Brain.
FAQAT system dagi ULANGBAN/ULANMAGAN va TOOL LAR ro'yxatidan foydalan.
list_service_orders, get_order_details kabi nomlarni O'YLAMA.
O'zbek → o'zbek. Internet → web_search.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|nima connect|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|tool lar/i.test(
    text
  );
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

function formatConnectionsReportSafe(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...(s.disconnected.length
        ? s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`)
        : ["(yo'q)"]),
      "\n## Haqiqiy tool lar",
      ...s.tools.map((name: string) => `- \`${name}\``),
      "\n_Manba: server, LLM fantaziyasi emas_",
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|nima connect|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|tool lar|funksiya/i.test(
    text
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

  // ALWAYS short-circuit inventory — model fantaziyasini to'xtatish
  if (isInventoryQuestion(lastText)) {
    log("info", "chat-api", "inventory short-circuit");
    return textStream(formatConnectionsReportSafe());
  }

  const brainCtx = buildBrainContext();
  // Always inject live JSON so model cannot invent
  const live = JSON.stringify(connectionsSummaryJson(), null, 2).slice(0, 6000);
  let extra = "";
  try {
    extra = await autoExtra(lastText);
  } catch (e) {
    extra = String(e);
  }

  const baseSystem =
    (system || SYSTEM_BASE) +
    "\n\n" +
    brainCtx +
    "\n\n## LIVE JSON\n" +
    live +
    (extra ? "\n\n## EXTRA\n" + extra : "");

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

  return textStream("Provayder javob bermadi.\n\n" + formatReport());
}

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR ro'yxatidan foydalan.
list_service_orders / get_order_details NOMALUM — ular yo'q (faqat get_business_overview bor).
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit/i.test(
    text
  );
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

  // Inventory / ulanish savollari → LLM YO'Q, faqat haqiqat
  if (isInventoryQuestion(lastText)) {
    return textStream(formatReport());
  }

  // ALWAYS inject live inventory so model cannot invent
  const live = JSON.stringify(connectionsSummaryJson(), null, 2).slice(0, 7000);
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR ro'yxati.
list_service_orders, get_order_details YO'Q — o'ylama.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect/i.test(
    text
  );
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

  // Inventory savollari → LLM YO'Q
  if (isInventoryQuestion(lastText)) {
    return textStream(formatReport());
  }

  // ALWAYS inject live inventory
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma/i.test(
    text
  );
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

  // Inventory / ulanish → LLM YO'Q
  if (isInventoryQuestion(lastText)) {
    return textStream(formatReport());
  }

  // ALWAYS inject live inventory
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q — o'ylama.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q (faqat get_business_overview).
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order/i.test(
    text
  );
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

  // Inventory → LLM yo'q, faqat haqiqat
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}

const SYSTEM_BASE = `Sen Pari AI.
Faqat system dagi ✅/❌ va TOOL LAR.
list_service_orders, get_order_details YO'Q.
O'zbek → o'zbek.`;

type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|key|kalit|connect|monitoring|buyurtma|overview|service.order|get_business|tool lar|mavjud|asosiy/i.test(
    text
  );
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

  // Inventory → LLM yo'q
  if (isInventoryQuestion(lastText)) {
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

function formatReport(): string {
  try {
    const s = connectionsSummaryJson();
    return [
      "## Haqiqiy ulanishlar (Railway process.env)\n",
      ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
      "\n## Ulanmagan",
      ...s.disconnected.map((c) => `❌ **${c.name}** — ${c.detail}`),
      "\n## Tool lar",
      ...s.tools.map((n: string) => `- \`${n}\``),
    ].join("\n");
  } catch (e) {
    return String(e);
  }
}
