import { NextRequest, NextResponse } from "next/server";
import { runTool } from "@/lib/tools";
import { callAI } from "@/lib/agents";

// POST /api/skilltree/enrich { topic } — searches the web for real, current info
// on the topic and returns one concise, factual knowledge note in Uzbek.
export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic || typeof topic !== "string") {
    return NextResponse.json({ error: "topic kerak" }, { status: 400 });
  }

  let searchContext = "";
  try {
    const result = (await runTool("web_search", { query: `${topic} 2026 best practices` })) as {
      results?: string[];
    };
    if (result?.results?.length) {
      searchContext = result.results.join("\n");
    }
  } catch { /* web_search failing shouldn't block the note — fall back to model knowledge */ }

  const prompt = `Sen texnik bilim bazasi yozuvchisisan. Foydalanuvchiga "${topic}" mavzusida BITTA qisqa (2-3 gap),
aniq va amaliy bilim yozuvi ber — real fakt yoki eng yaxshi amaliyot bo'lsin, umumiy gap emas.
${searchContext ? `Quyidagi qidiruv natijalaridan foydalan:\n${searchContext}\n` : ""}
Faqat o'zbek tilida, faqat yozuv matnini ber — sarlavha yoki izohsiz.`;

  const note = await callAI(prompt, topic);
  return NextResponse.json({ note: note.trim(), grounded: Boolean(searchContext) });
}
