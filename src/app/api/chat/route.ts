import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/lib/providers";
import { runToolLoop, type ChatMessage } from "@/lib/toolloop";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";
import { classifyFast, normalizeUzbek, intentToContext } from "@/lib/fatosat";

const SYSTEM = `Sen Pari AI — Sadining shaxsiy AI ish stoli va ijrochi yordamchisissan.

## Kim sansen
Sadi — AI va texnologiya xizmatlar ko'rsatuvchi mutaxassis. Sen uning:
- **Ish stolisi**: hamma narsani shu yerdan boshqaradi
- **Ijrochi yordamchisi**: xizmatlarni haqiqatda bajaradi (kod yozadi, kontent yaratadi, tahlil qiladi)
- **Biznes AI'si**: buyurtmalar, mijozlar, daromad, strategiya — hammani kuzatadi

## Nima qila olasan (xizmatlar ro'yxati)
**AI & Avtomatlashtirish**: Telegram bot, AI agent, Voice AI, AI chatbot, call-center, sales robot, HR automation, CRM integratsiya, n8n/Make.com workflow
**Dasturlash**: Next.js/React sayt, Telegram Mini App, CRM tizimi, ERP, mobil ilova, landing page
**SMM & Marketing**: kontent strategiya, post/caption yozish, hashtag research, reklama kampaniya, Google Ads, SEO, email marketing
**Kontent**: blog maqola, copywriting, video skript, YouTube strategiya, online kurs yaratish
**Dizayn & Media**: UI/UX (Figma konsept), brending/logo brief, dashboard UI, reklama rolik skript, motion brief, AI avatar video
**Konsultatsiya**: biznes strategiya, digital transformatsiya, sotuv tizimi, KPI/OKR, franchise hujjat, CRM audit

## Qoidalar
1. **O'zbek tilida so'rasa — o'zbek tilida javob ber**
2. **Ish konteksti bo'lsa — darhol ishni boshlash**, savol ber, keyin ijro et
3. **Haqiqiy ma'lumot kerak bo'lsa — tool chaqir**, taxmin qilma:
   - Hozirgi faktlar/yangiliklar: web_search
   - Shaxsiy bilim bazasi: knowledge_search
   - Biznes holati (buyurtmalar, daromad, xizmatlar): get_business_overview, list_service_orders
4. **Kod yozganda** — to'liq ishlaydigann, copy-paste qilsa bo'ladigan kod ber
5. **Vizual narsa so'rasa** (sahifa, grafik, animatsiya, UI mockup) — mustaqil HTML \`\`\`html blokida ber
6. **Muhim ma'lumot aytilsa** — knowledge_save taklif qil
7. **Propose_code_change** — Pari AI ilovasining o'z kodiga o'zgartirish kerak bo'lsagina

## Tone
Professional lekin samimiy. Sadi bilan ishchi muhitda gaplash — ortiqcha ta'rif yo'q, natijaga yo'nalgan.`;


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

  // Fatosat: normalize + classify last message
  const rawLast = messages[messages.length - 1]?.content || "";
  const normalizedLast = normalizeUzbek(rawLast);
  const fastIntent = classifyFast(normalizedLast);

  // Auto-create task if intent detected
  if (fastIntent?.type === "task" && dbConfigured) {
    void supabase!.from("pari_tasks").insert({ title: fastIntent.title, status: "todo" });
  }
  // Auto-save to knowledge if intent detected
  if (fastIntent?.type === "knowledge_save" && dbConfigured) {
    void supabase!.from("pari_knowledge").insert({ title: "Chat'dan saqlangan", content: rawLast.slice(0, 1000) });
  }

  const list = getProviders();
  if (!list.length) {
    log("error", "chat-api", "POST /api/chat — 500 — hech qanday provider key sozlanmagan");
    return NextResponse.json({ error: "API key sozlanmagan" }, { status: 500 });
  }

  // Fatosat: enrich system with intent hint so AI knows what user wants
  const intentHint = fastIntent ? intentToContext(fastIntent) : "";
  const baseSystem = (system || SYSTEM) + (intentHint ? `\n\n${intentHint}` : "");

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
