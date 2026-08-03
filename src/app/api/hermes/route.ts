import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { log } from "@/lib/logger";
import { AGENTS, callAI, type AgentId } from "@/lib/agents";
import { experienceContext, saveTrace } from "@/lib/trace-memory";
import { ownerSystemBlock, OWNER } from "@/lib/owner";

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

const ROUTER_PROMPT = `${ownerSystemBlock()}

Sen Hermes — Pari AI agent-orkestratori.
Egasi: ${OWNER.shortName} (@${OWNER.username}). Uning buyruqlarini chalkashtirmasdan yo'naltir.

Mavjud agentlar:
${AGENT_IDS.map((id) => `- ${id}: ${AGENTS[id].name}`).join("\n")}

Faqat JSON: {"agents": ["id1"], "reason": "..."}`;

const SYNTH_PROMPT = `Bir nechta agent javoblarini bitta aniq o'zbekcha xulosaga birlashtir. Chalkashtirma.`;

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
    if (!agents.length) return { agents: ["assistant"], reason: parsed.reason || "Standart" };
    return { agents: agents.slice(0, 4), reason: parsed.reason || "" };
  } catch {
    return { agents: ["assistant"], reason: "Yo'naltirishda xato" };
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { task, synthesize = true } = await req.json();
  if (!task || typeof task !== "string" || !task.trim()) {
    return NextResponse.json({ error: "task kerak" }, { status: 400 });
  }

  const trimmed = task.trim();
  const [memCtx, expCtx] = await Promise.all([
    fetchMemoryContext(trimmed),
    experienceContext(trimmed),
  ]);

  const enrichedTask = [
    memCtx ? `Kontekst:\n${memCtx}` : "",
    expCtx ? `Tajriba:\n${expCtx}` : "",
    `Vazifa (egasi ${OWNER.shortName}): ${trimmed}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { agents: agentIds, reason } = await routeTask(trimmed);

  const results = await Promise.all(
    agentIds.map(async (id) => {
      const agent = AGENTS[id];
      const result = await callAI(agent.prompt, enrichedTask);
      return { agentId: id, agent: agent.name, icon: agent.icon, result };
    })
  );

  let synthesis: string | null = null;
  if (synthesize && results.length > 1) {
    const bundle = results.map((r) => `### ${r.agent}\n${r.result}`).join("\n\n");
    synthesis = await callAI(SYNTH_PROMPT, `Vazifa: ${trimmed}\n\n${bundle}`);
  }

  await saveTrace({
    task: trimmed,
    steps: [
      ...agentIds.map((id) => ({ type: "agent" as const, agent: id })),
      ...(synthesis ? [{ type: "final" as const, content: synthesis.slice(0, 500) }] : []),
    ],
    answer: synthesis || results[0]?.result,
    success: true,
    source: "hermes",
  });

  log("info", "hermes", `→ [${agentIds.join(", ")}] owner-aware`);

  return NextResponse.json({
    routing: { agents: agentIds, reason },
    results,
    synthesis,
    meta: { latency_ms: Date.now() - start, owner: OWNER.username },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    owner: OWNER.username,
    agents: AGENT_IDS.map((id) => ({ id, name: AGENTS[id].name })),
  });
}
