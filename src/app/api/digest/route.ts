import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/agents";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";

/**
 * Morning Digest — OpenJarvis morning_digest agent'dan ilhomlangan.
 * Tasks + calendar + knowledge asosida kundalik brifing.
 * Automation yoki qo'lda chaqiriladi.
 */

async function loadTasks(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const { data } = await supabase!
      .from("pari_tasks")
      .select("title, priority, description, status")
      .order("created_at", { ascending: false })
      .limit(15);
    return (data || []).map((t) => {
      const st = t.status ? ` [${t.status}]` : "";
      const pr = t.priority ? ` (${t.priority})` : "";
      return `- ${t.title}${pr}${st}${t.description ? ": " + String(t.description).slice(0, 80) : ""}`;
    });
  } catch {
    return [];
  }
}

async function loadEvents(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const today = new Date().getDay(); // 0-6
    const { data } = await supabase!
      .from("pari_events")
      .select("title, time, type, day")
      .order("day", { ascending: true })
      .limit(20);
    return (data || [])
      .filter((e) => e.day === today || e.day === ((today + 1) % 7))
      .map((e) => `- ${e.time || "?"} — ${e.title} (${e.type || "event"}, kun ${e.day})`);
  } catch {
    return [];
  }
}

async function loadKnowledgeHints(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const { data } = await supabase!
      .from("pari_knowledge")
      .select("title, content")
      .order("created_at", { ascending: false })
      .limit(5);
    return (data || []).map((k) => `- ${k.title}: ${String(k.content || "").slice(0, 120)}`);
  } catch {
    return [];
  }
}

const DIGEST_PROMPT = `Sen Pari AI Morning Digest agentisan — OpenJarvis morning_digest uslubida.
Vazifa: foydalanuvchi uchun qisqa, amaliy kundalik brifing yoz.

Qoidalar:
1. O'zbek tilida yoz
2. 4-8 qisqa paragraf / bullet — ovozda ham eshitish qulay bo'lsin
3. Muhim vazifalar va tadbirlarni ajratib ko'rsat
4. Agar ma'lumot kam bo'lsa — shuni ochiq ayt, o'ylab topma
5. Oxirida 1-2 ta aniq keyingi qadam tavsiya qil
6. Markdown: sarlavha + bullet`;

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    let focus = "";
    try {
      const body = await req.json();
      focus = String(body?.focus || "").trim();
    } catch {
      /* empty body ok */
    }

    const [tasks, events, knowledge] = await Promise.all([
      loadTasks(),
      loadEvents(),
      loadKnowledgeHints(),
    ]);

    const context = [
      `Sana: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
      focus ? `Diqqat markazi: ${focus}` : "",
      "\n## Vazifalar",
      tasks.length ? tasks.join("\n") : "(vazifa yo'q)",
      "\n## Bugun / ertaga tadbirlar",
      events.length ? events.join("\n") : "(tadbir yo'q)",
      "\n## So'nggi bilim / eslatmalar",
      knowledge.length ? knowledge.join("\n") : "(eslatma yo'q)",
    ]
      .filter(Boolean)
      .join("\n");

    const digest = await callAI(DIGEST_PROMPT, context);
    const ms = Date.now() - start;
    log("info", "digest", `Morning digest tayyor (${ms}ms)`);

    if (dbConfigured) {
      void supabase!.from("pari_notifications").insert({
        title: "☀️ Kunlik brifing tayyor",
        body: digest.slice(0, 120),
        type: "info",
      });
    }

    return NextResponse.json({
      digest,
      meta: {
        latency_ms: ms,
        tasks: tasks.length,
        events: events.length,
        knowledge: knowledge.length,
      },
    });
  } catch (e) {
    log("error", "digest", String(e));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description: "Morning Digest — tasks + calendar + knowledge asosida kundalik brifing. OpenJarvis morning_digest ilhomida.",
    usage: { method: "POST", body: { focus: "optional string" } },
  });
}
