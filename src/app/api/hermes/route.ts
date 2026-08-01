import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { log } from "@/lib/logger";
import { AGENTS, callAI, type AgentId } from "@/lib/agents";

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

const ROUTER_PROMPT = `Sen Hermes — Pari AI'ning agent-orkestratori (OpenJarvis orchestrator uslubida).
Vazifang: foydalanuvchi so'ragan ishni tahlil qilib, qaysi ixtisoslashgan agent(lar) uni bajarishi kerakligini aniqlash.

Mavjud agentlar:
${AGENT_IDS.map((id) => `- ${id}: ${AGENTS[id].name} — ${AGENTS[id].prompt.split("\n")[0]}`).join("\n")}

Qoidalar:
1. Vazifa bir nechta sohaga tegishli bo'lsa, bir nechta agent tanla (masalan kod + deploy → coder va devops)
2. Oddiy suhbat yoki umumiy savol bo'lsa — "assistant" ni tanla
3. Chuqur tadqiqot so'ralsa — researcher + analyst
4. Faqat quyidagi JSON formatda javob ber, boshqa hech narsa yozma:
{"agents": ["id1", "id2"], "reason": "qisqa izoh nima uchun shu agent(lar) tanlandi"}`;

const SYNTH_PROMPT = `Sen orchestrator sintez agentisan.
Bir nechta ixtisoslashgan agent javoblarini birlashtirib, foydalanuvchi uchun bitta aniq, amaliy xulosa yoz.
Qoidalar:
- O'zbek tilida (agar vazifa o'zbekcha bo'lsa)
- Takrorlarni olib tashla
- Ziddiyatlarni ochiq ayt
- Oxirida aniq keyingi qadamlar ber
- Markdown ishlat`;

async function fetchMemoryContext(task: string): Promise<string> {
  if (!dbConfigured) return "";
  try {
    const { data } = await supabase!
      .from("pari_knowledge")
      .select("title, content")
      .or(`title.ilike.%${task.slice(0, 50)}%,content.ilike.%${task.slice(0, 50)}%`)
      .limit(3);
    if (!data?.length) return "";
    return data.map((m) => `[Xotira: ${m.title}] ${String(m.content).slice(0, 200)}`).join("\n");
  } catch {
    return "";
  }
}

async function routeTask(task: string): Promise<{ agents: AgentId[]; reason: string }> {
  const raw = await callAI(ROUTER_PROMPT, task);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const agents = (parsed.agents || []).filter((id: string): id is AgentId =>
      AGENT_IDS.includes(id as AgentId)
    );
    if (!agents.length) return { agents: ["assistant"], reason: parsed.reason || "Standart agent tanlandi" };
    return { agents: agents.slice(0, 4), reason: parsed.reason || "" };
  } catch {
    return { agents: ["assistant"], reason: "Yo'naltirishda xato — standart agent ishlatildi" };
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { task, synthesize = true } = await req.json();
  if (!task || typeof task !== "string" || !task.trim()) {
    return NextResponse.json({ error: "task kerak" }, { status: 400 });
  }

  const trimmed = task.trim();
  const memCtx = await fetchMemoryContext(trimmed);
  const enrichedTask = memCtx
    ? `Kontekst (xotira):\n${memCtx}\n\nVazifa: ${trimmed}`
    : trimmed;

  const { agents: agentIds, reason } = await routeTask(trimmed);

  const results = await Promise.all(
    agentIds.map(async (id) => {
      const agent = AGENTS[id];
      const result = await callAI(agent.prompt, enrichedTask);
      return { agentId: id, agent: agent.name, icon: agent.icon, result };
    })
  );

  // Multi-agent bo'lsa — OpenJarvis orchestrator kabi yakuniy sintez
  let synthesis: string | null = null;
  if (synthesize && results.length > 1) {
    const bundle = results
      .map((r) => `### ${r.agent}\n${r.result}`)
      .join("\n\n");
    synthesis = await callAI(
      SYNTH_PROMPT,
      `Asl vazifa: ${trimmed}\n\nAgent javoblari:\n${bundle}`
    );
  }

  const ms = Date.now() - start;
  log("info", "hermes", `Yo'naltirildi → [${agentIds.join(", ")}] (${ms}ms) — "${trimmed.slice(0, 60)}"`);

  if (dbConfigured) {
    for (const r of results) {
      await supabase!
        .from("pari_agent_runs")
        .insert({ agent_id: r.agentId, agent_name: r.agent, task: trimmed, result: r.result })
        .then(() => {}, () => {});
    }
  }

  return NextResponse.json({
    routing: { agents: agentIds, reason },
    results,
    synthesis,
    meta: { latency_ms: ms, memory_used: !!memCtx },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description:
      "Hermes — vazifani tavsifiga qarab tegishli agent(lar)ga avtomatik yo'naltiradi + xotira konteksti + multi-agent sintez (OpenJarvis orchestrator ilhomida)",
    agents: AGENT_IDS.map((id) => ({ id, name: AGENTS[id].name, icon: AGENTS[id].icon })),
  });
}
