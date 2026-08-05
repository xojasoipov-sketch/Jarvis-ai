import { NextRequest, NextResponse } from "next/server";
import { classifyFast, normalizeUzbek } from "@/lib/fatosat";
import { callAI } from "@/lib/agents";

// AI-powered intent classification (fallback when fast rules don't match)
const AI_INTENT_PROMPT = `Sen Pari AI'ning niyat analizatorisan. Foydalanuvchi xabarini o'qib, quyidagi JSON formatda qaytarim ber:

{"intent": "<intent_nomi>", "confidence": 0.9, "params": {}}

Mumkin bo'lgan intentlar:
- "chat" — oddiy suhbat, savol-javob
- "code" — kod yozish, debug, texnik yordam
- "task" — vazifa qo'shish (params: {"title": "..."})
- "search" — ma'lumot qidirish (params: {"query": "..."})
- "analyze" — tahlil, statistika, ma'lumot tahlili
- "write" — kontent, maqola, matn yozish
- "devops" — server, deploy, infra
- "plan" — strategiya, reja, roadmap
- "calendar" — jadval, eslatma, sana
- "finance" — pul, byudjet, moliya
- "legal" — shartnoma, huquq

Faqat JSON qaytarim ber, hech narsa qo'shma.`;

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text kerak" }, { status: 400 });
  }

  const normalized = normalizeUzbek(text.trim());

  // Fast path — no AI needed
  const fast = classifyFast(normalized);
  if (fast) {
    return NextResponse.json({ intent: fast, source: "rules", normalized });
  }

  // AI path — for ambiguous messages
  try {
    const raw = await callAI(AI_INTENT_PROMPT, normalized);
    const match = raw.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return NextResponse.json({
        intent: { type: parsed.intent, ...parsed.params },
        confidence: parsed.confidence ?? 0.7,
        source: "ai",
        normalized,
      });
    }
  } catch {}

  return NextResponse.json({ intent: { type: "chat" }, source: "fallback", normalized });
}

export async function GET() {
  return NextResponse.json({
    description: "Fatosat — niyat analizatori. POST {text} → {intent, source}",
    intents: ["chat", "code", "task", "search", "analyze", "write", "devops", "plan", "calendar", "finance", "legal"],
  });
}
