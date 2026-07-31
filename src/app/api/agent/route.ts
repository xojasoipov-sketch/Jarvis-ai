import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";
import { log } from "@/lib/logger";
import { AGENTS, callAI } from "@/lib/agents";

async function fetchMemoryContext(task: string): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/knowledge?q=${encodeURIComponent(task.slice(0, 100))}`);
    if (!res.ok) return "";
    const data = await res.json();
    const items = data.items || data.results || [];
    if (!items.length) return "";
    return items.slice(0, 3).map((m: { title: string; content: string }) =>
      `[Xotira: ${m.title}] ${m.content.slice(0, 200)}`
    ).join("\n");
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  const { agentId, task, context, useMemory } = await req.json();
  const agent = AGENTS[agentId as keyof typeof AGENTS];
  if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 400 });

  let memCtx = context || "";
  if (!memCtx && useMemory !== false) {
    memCtx = await fetchMemoryContext(task);
  }

  const userMsg = memCtx ? `Kontekst:\n${memCtx}\n\nVazifa: ${task}` : task;
  const result = await callAI(agent.prompt, userMsg);

  log("info", "agent", `${agent.name} vazifani bajardi: "${task.slice(0, 60)}"`);
  if (dbConfigured) {
    void supabase!.from("pari_agent_runs").insert({ agent_id: agentId, agent_name: agent.name, task, result });
    // Send in-app notification
    void supabase!.from("pari_notifications").insert({
      title: `${agent.icon} ${agent.name} vazifani bajardi`,
      body: task.slice(0, 80),
      type: "success",
    });
  }

  return NextResponse.json({ agent: agent.name, icon: agent.icon, result, agentId });
}

// GET /api/agent          — list available agents
// GET /api/agent?history=1 — recent agent run history (Supabase-backed)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("history")) {
    if (!dbConfigured) return NextResponse.json({ runs: [], configured: false });
    const { data, error } = await supabase!.from("pari_agent_runs").select("*").order("created_at", { ascending: false }).limit(20);
    if (error) return NextResponse.json({ runs: [], error: error.message }, { status: 500 });
    return NextResponse.json({ runs: data, configured: true });
  }
  return NextResponse.json({
    agents: Object.entries(AGENTS).map(([id, a]) => ({ id, name: a.name, icon: a.icon })),
  });
}
