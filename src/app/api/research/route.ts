import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/agents";
import { runTool } from "@/lib/tools";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";

/**
 * Deep Research — OpenJarvis deep_research agent'dan ilhomlangan.
 * Multi-hop: knowledge + web search → sintez + manbalar.
 * Mavjud chat/agent oqimini buzmaydi — alohida endpoint.
 */

async function knowledgeHits(query: string): Promise<{ title: string; content: string }[]> {
  if (!dbConfigured) return [];
  try {
    const { data } = await supabase!
      .from("pari_knowledge")
      .select("title, content")
      .or(`title.ilike.%${query.slice(0, 60)}%,content.ilike.%${query.slice(0, 60)}%`)
      .limit(4);
    return (data || []).map((r) => ({ title: r.title, content: (r.content || "").slice(0, 400) }));
  } catch {
    return [];
  }
}

async function webHits(query: string): Promise<string[]> {
  try {
    const result = (await runTool("web_search", { query })) as { results?: string[] };
    return result?.results || [];
  } catch {
    return [];
  }
}

const RESEARCH_PROMPT = `Sen Deep Research Agent'san — OpenJarvis uslubidagi multi-hop tadqiqotchi.
Vazifa: berilgan manbalar asosida chuqur, aniq va manbali javob yoz.

Qoidalar:
1. O'zbek tilida javob ber (agar savol o'zbekcha bo'lsa)
2. Faktlarni manbalarga bog'la (masalan: [1], [2])
3. Noma'lum narsani o'ylab topma — manbada yo'q bo'lsa shuni ayt
4. Tuzilma:
   - Qisqa xulosa (2-3 gap)
   - Asosiy topilmalar (bullet)
   - Manbalar ro'yxati
5. Markdown ishlat`;

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json();
    // query yoki topic — ikkalasi ham qabul qilinadi (UI/agent mosligi)
    const { query, topic, depth } = body as {
      query?: string;
      topic?: string;
      depth?: number;
    };
    const q = String(query || topic || "").trim();
    if (!q) return NextResponse.json({ error: "query yoki topic kerak" }, { status: 400 });

    // Parallel gather (multi-hop step 1)
    const [kb, web] = await Promise.all([knowledgeHits(q), webHits(q)]);

    const sources: { id: number; type: string; title: string; excerpt: string }[] = [];
    let srcId = 1;
    for (const k of kb) {
      sources.push({ id: srcId++, type: "knowledge", title: k.title, excerpt: k.content });
    }
    for (const w of web.slice(0, 5)) {
      sources.push({ id: srcId++, type: "web", title: w.slice(0, 80), excerpt: w });
    }

    // depth >= 2 bo'lsa — ikkinchi qidiruv (follow-up queries)
    if (Number(depth) >= 2 && sources.length > 0) {
      const followRaw = await callAI(
        "Qisqa qidiruv so'rovlarini JSON massiv sifatida qaytar. Faqat JSON: [\"so'rov1\", \"so'rov2\"]",
        `Asosiy savol: ${q}\nTopilgan manbalar: ${sources.map((s) => s.title).join("; ")}\nYana 1-2 ta aniqroq qidiruv so'rovi yoz.`
      );
      try {
        const m = followRaw.match(/\[[\s\S]*\]/);
        const queries: string[] = JSON.parse(m ? m[0] : "[]");
        for (const fq of queries.slice(0, 2)) {
          const more = await webHits(String(fq));
          for (const w of more.slice(0, 2)) {
            sources.push({ id: srcId++, type: "web", title: w.slice(0, 80), excerpt: w });
          }
        }
      } catch {
        /* follow-up ixtiyoriy */
      }
    }

    const contextBlock = sources.length
      ? sources.map((s) => `[${s.id}] (${s.type}) ${s.title}\n${s.excerpt}`).join("\n\n")
      : "Manba topilmadi — umumiy bilim asosida ehtiyotkor javob ber.";

    const userMsg = `Tadqiqot savoli: ${q}\n\n--- MANBALAR ---\n${contextBlock}\n--- /MANBALAR ---\n\nYuqoridagi manbalar asosida tadqiqot hisobotini yoz.`;

    const report = await callAI(RESEARCH_PROMPT, userMsg);
    const ms = Date.now() - start;
    log("info", "research", `Deep research (${ms}ms): "${q.slice(0, 50)}" — ${sources.length} manba`);

    return NextResponse.json({
      query: q,
      report,
      sources,
      meta: { latency_ms: ms, source_count: sources.length, depth: Number(depth) || 1 },
    });
  } catch (e) {
    log("error", "research", String(e));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description:
      "Deep Research — multi-hop tadqiqot (knowledge + web → sintez + manbalar). OpenJarvis deep_research ilhomida.",
    usage: { method: "POST", body: { query: "string", topic: "string (ixtiyoriy alias)", depth: "1|2 (ixtiyoriy)" } },
  });
}
