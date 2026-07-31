import { NextResponse } from "next/server";
import { vaultConfigured, walkVault } from "@/lib/githubVault";
import { BUILTIN_TOOLS } from "@/lib/tools";
import { supabase, dbConfigured } from "@/lib/supabase";

export type MemoryNode = { label: string; type: "vault" | "task" | "project" | "agent" | "tool" };

// Real "second brain" nodes — each dot in the neural butterfly maps 1:1 to one of these.
export async function GET() {
  const nodes: MemoryNode[] = [];

  if (vaultConfigured) {
    try {
      const files = await walkVault("");
      for (const f of files.slice(0, 150)) nodes.push({ label: f, type: "vault" });
    } catch {
      // vault unreachable — skip, other sources still contribute
    }
  }

  for (const t of BUILTIN_TOOLS) nodes.push({ label: t.name, type: "tool" });

  if (dbConfigured) {
    const [tasks, projects, runs] = await Promise.all([
      supabase!.from("pari_tasks").select("title").limit(60),
      supabase!.from("pari_projects").select("name").limit(30),
      supabase!.from("pari_agent_runs").select("agent_name, task").order("created_at", { ascending: false }).limit(40),
    ]);
    for (const t of tasks.data || []) nodes.push({ label: t.title, type: "task" });
    for (const p of projects.data || []) nodes.push({ label: p.name, type: "project" });
    for (const r of runs.data || []) nodes.push({ label: `${r.agent_name}: ${r.task}`, type: "agent" });
  }

  const counts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ nodes, counts, total: nodes.length });
}
