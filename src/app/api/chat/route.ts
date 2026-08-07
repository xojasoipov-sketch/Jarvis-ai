import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";
import { log } from "@/lib/logger";
import { ENV, envAny } from "@/lib/env";
import { runToolLoop as sharedRunToolLoop, DEVICE_CONTROL_RULES, type ChatMessage as SharedChatMessage } from "@/lib/agentLoop";

export const maxDuration = 60;

const SYSTEM_BASE = `Sen Pari — Sadining shaxsiy AI yordamchisi va Business OS miyasi.

MUHIM QOIDALAR (buzsiz bajariladigan):
1. HECH QACHON "Nima qilmoqchisiz?", "Qanday yordam bera olaman?", "Aniqlashtira olasizmi?" dema.
2. Buyruq kelsa — DARHOL bajara boshla. Savol so'rama.
3. Agar buyruq noaniq bo'lsa — eng mantiqiy talqinni qilib bajar.
4. Javob qisqa, aniq, o'zbek tilida. Keraksiz izoh yo'q.
5. Tool kerak bo'lsa — chaqir, natijani ayt. "Qilayinmi?" dema — QIL.
6. Sen kuchli, mustaqil, proaktiv yordamchisan. Har doim biror narsa taklif qil yoki amalga oshir.

USLUB: Jarvis kabi — qisqa, ishonchli, samarali. "Albatta", "Keling", "Mumkin" kabi so'zlar yo'q.
Faqat haqiqiy tool va ulanishlardan foydalan.
${DEVICE_CONTROL_RULES}`;


type ChatMessage = SharedChatMessage;

/** Inventory — hech qanday circular import yo'q */
function buildInventoryReport(): string {
  const lines: string[] = ["## Haqiqiy ulanishlar (Railway process.env)\n"];

  const checks: { name: string; ok: boolean; detail: string }[] = [
    {
      name: "Supabase",
      ok: Boolean(ENV.supabaseUrl() && ENV.supabaseKey()),
      detail: ENV.supabaseUrl() ? ENV.supabaseUrl().slice(0, 40) + "…" : "URL/KEY yo'q",
    },
    {
      name: "Telegram Bot",
      ok: Boolean(ENV.telegram()),
      detail: ENV.telegram() ? "TELEGRAM_BOT_TOKEN bor" : "yo'q",
    },
    {
      name: "GitHub",
      ok: Boolean(ENV.github()),
      detail: ENV.github() ? "Token bor" : "GITHUB_TOKEN yo'q",
    },
    {
      name: "Groq",
      ok: Boolean(ENV.groq()),
      detail: ENV.groq() ? "Tool-calling OK" : "yo'q",
    },
    {
      name: "Gemini",
      ok: Boolean(ENV.gemini()),
      detail: ENV.gemini() ? "Key bor" : "yo'q",
    },
    {
      name: "OpenAI",
      ok: Boolean(ENV.openai()),
      detail: ENV.openai() ? "Key bor" : "yo'q",
    },
    {
      name: "ElevenLabs",
      ok: Boolean(ENV.elevenlabs()),
      detail: ENV.elevenlabs() ? "TTS/STT" : "yo'q",
    },
    {
      name: "Railway",
      ok: envAny("RAILWAY_ENVIRONMENT", "RAILWAY_PUBLIC_DOMAIN", "RAILWAY_PROJECT_ID"),
      detail: process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_ENVIRONMENT_NAME || "—",
    },
    { name: "Internet (web_search)", ok: true, detail: "server-side built-in" },
    { name: "Hermes", ok: true, detail: "/api/hermes built-in" },
  ];

  for (const c of checks) {
    lines.push(`${c.ok ? "✅" : "❌"} **${c.name}** — ${c.detail}`);
  }

  lines.push("\n## Haqiqiy tool lar (o'ylab chiqarilmagan)");
  lines.push(
    [
      "list_connections",
      "web_search",
      "web_fetch",
      "extract_emails",
      "extract_social_links",
      "extract_images",
      "extract_page_text",
      "extract_list",
      "knowledge_search",
      "knowledge_save",
      "create_task",
      "get_business_overview",
      "create_file",
      "read_file",
      "vault_read",
      "vault_write",
      "propose_code_change",
      "railway_info",
      "datetime",
    ]
      .map((t) => `- \`${t}\``)
      .join("\n")
  );
  lines.push("\n_Manba: process.env (LLM fantaziya emas)_");
  return lines.join("\n");
}

function isInventoryQuestion(text: string): boolean {
  return /nima ulan|qanday tool|qaysi tool|ulangan|connected|list_connections|nima bor|asosiy tool|vositalar|integratsiya|github|telegram|supabase|railway|obsidian|hermes|konnekt|toolar|funksiya|kalit|connect|monitoring|buyurtma|overview|mavjud|toollar|api.?lar/i.test(
    text
  );
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

// runToolLoop endi src/lib/agentLoop.ts'da — chat va ovoz (/api/voice) bir xil
// AI+tool ziljasidan foydalanadi, shu jumladan qurilma boshqaruvi.
const runToolLoop = sharedRunToolLoop;

export async function POST(req: NextRequest) {
  const start = Date.now();
  let body: { messages?: ChatMessage[]; system?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages = [], system } = body;
  const list = getProviders();
  if (!list.length) {
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastText = typeof lastUser?.content === "string" ? lastUser.content : "";

  // ★ Inventory — LLM ga umuman bermaymiz
  if (isInventoryQuestion(lastText)) {
    log("info", "chat-api", "inventory short-circuit");
    return textStream(buildInventoryReport());
  }

  const invHint = buildInventoryReport().slice(0, 2500);
  const baseSystem = (system || SYSTEM_BASE) + "\n\n" + invHint;

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

  // Stream fallback — qisqa timeout, pipe xatosini kamaytirish
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
        signal: AbortSignal.timeout(40000),
      });
      if (!res.ok || !res.body) continue;

      const enc = new TextEncoder();
      return new Response(
        new ReadableStream({
          async start(ctrl) {
            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            let buf = "";
            try {
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
            } catch (err) {
              log("warn", "chat-api", `stream pipe: ${String(err)}`);
              try {
                ctrl.enqueue(enc.encode("\n\n[Javob uzildi — qayta urinib ko'ring]"));
              } catch {}
            } finally {
              try {
                ctrl.close();
              } catch {}
            }
          },
        }),
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    } catch {
      continue;
    }
  }

  return textStream("Provayder ishlamadi.\n\n" + buildInventoryReport());
}
