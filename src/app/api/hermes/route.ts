import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { log } from "@/lib/logger";
import { AGENTS, callAI, type AgentId } from "@/lib/agents";

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

const ROUTER_PROMPT = `Sen Hermes — Pari AI'ning agent-orkestratori. Vazifang: foydalanuvchi so'ragan ishni tahlil qilib,
qaysi ixtisoslashgan agent(lar) uni bajarishi kerakligini aniqlash.

Mavjud agentlar:
${AGENT_IDS.map((id) => `- ${id}: ${AGENTS[id].name} — ${AGENTS[id].prompt.split("\n")[0]}`).join("\n")}

Qoidalar:
1. Vazifa bir nechta sohaga tegishli bo'lsa, bir nechta agent tanla (masalan kod + deploy → coder va devops)
2. Oddiy suhbat yoki umumiy savol bo'lsa — "assistant" ni tanla
3. Faqat quyidagi JSON formatda javob ber, boshqa hech narsa yozma:
{"agents": ["id1", "id2"], "reason": "qisqa izoh nima uchun shu agent(lar) tanlandi"}`;

async function routeTask(task: string): Promise<{ agents: AgentId[]; reason: string }> {
  const raw = await callAI(ROUTER_PROMPT, task);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const agents = (parsed.agents || []).filter((id: string): id is AgentId => AGENT_IDS.includes(id as AgentId));
    if (!agents.length) return { agents: ["assistant"], reason: parsed.reason || "Standart agent tanlandi" };
    return { agents, reason: parsed.reason || "" };
  } catch {
    return { agents: ["assistant"], reason: "Yo'naltirishda xato — standart agent ishlatildi" };
  }
}

export async function POST(req: NextRequest) {
  const { task } = await req.json();
  if (!task || typeof task !== "string" || !task.trim()) {
    return NextResponse.json({ error: "task kerak" }, { status: 400 });
  }

  const { agents: agentIds, reason } = await routeTask(task.trim());

  const results = await Promise.all(
    agentIds.map(async (id) => {
      const agent = AGENTS[id];
      const result = await callAI(agent.prompt, task);
      return { agentId: id, agent: agent.name, icon: agent.icon, result };
    })
  );

  log("info", "hermes", `Yo'naltirildi → [${agentIds.join(", ")}] — "${task.slice(0, 60)}"`);
  if (dbConfigured) {
    for (const r of results) {
      await supabase!.from("pari_agent_runs").insert({
        agent_id: r.agentId, agent_name: r.agent, task, result: r.result,
      }).then(() => {}, () => {});
    }
  }

  return NextResponse.json({ routing: { agents: agentIds, reason }, results });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description: "Hermes — vazifani tavsifiga qarab tegishli agent(lar)ga avtomatik yo'naltiradi",
    agents: AGENT_IDS.map((id) => ({ id, name: AGENTS[id].name, icon: AGENTS[id].icon })),
  });
}
