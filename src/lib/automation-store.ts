/**
 * Automation Store — flow CRUD + run history
 * Real DB when Supabase configured, in-memory fallback.
 */
import { supabase, dbConfigured } from "./supabase";
import type { FlowNode, VisualFlow } from "./flows";

export type TriggerType = "manual" | "schedule" | "webhook" | "keyword" | "event";

export interface AutoFlow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: FlowNode[];
  trigger_type: TriggerType;
  trigger_config: Record<string, string>;
  runs: number;
  last_run_at?: string;
  created_at: string;
}

export interface FlowRunStep {
  node_id: string;
  type: string;
  ok: boolean;
  output: string;
  ms: number;
}

export interface FlowRun {
  id: string;
  flow_id: string;
  status: "running" | "done" | "error";
  trigger: string;
  steps: FlowRunStep[];
  error?: string;
  started_at: string;
  finished_at?: string;
}

// In-memory fallback
const memFlows = new Map<string, AutoFlow>();
const memRuns = new Map<string, FlowRun>();

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listFlows(): Promise<AutoFlow[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase
      .from("pari_flows")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }
  return [...memFlows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getFlow(id: string): Promise<AutoFlow | null> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_flows").select("*").eq("id", id).single();
    return data || null;
  }
  return memFlows.get(id) || null;
}

export async function createFlow(data: Omit<AutoFlow, "id" | "runs" | "created_at">): Promise<AutoFlow> {
  const flow: AutoFlow = {
    ...data,
    id: uid(),
    runs: 0,
    created_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    await supabase.from("pari_flows").insert(flow);
  } else {
    memFlows.set(flow.id, flow);
  }
  return flow;
}

export async function updateFlow(id: string, patch: Partial<AutoFlow>): Promise<AutoFlow | null> {
  const existing = await getFlow(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    await supabase.from("pari_flows").update(patch).eq("id", id);
  } else {
    memFlows.set(id, updated);
  }
  return updated;
}

export async function deleteFlow(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_flows").delete().eq("id", id);
  } else {
    memFlows.delete(id);
  }
}

// ── Run history ───────────────────────────────────────────────────────────────

export async function createRun(flowId: string, trigger: string): Promise<FlowRun> {
  const run: FlowRun = {
    id: uid(),
    flow_id: flowId,
    status: "running",
    trigger,
    steps: [],
    started_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    await supabase.from("pari_flow_runs").insert(run);
  } else {
    memRuns.set(run.id, run);
  }
  return run;
}

export async function finishRun(
  runId: string,
  steps: FlowRunStep[],
  error?: string
): Promise<void> {
  const patch = {
    steps,
    status: error ? "error" : "done",
    error: error || null,
    finished_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    await supabase.from("pari_flow_runs").update(patch).eq("id", runId);
  } else {
    const run = memRuns.get(runId);
    if (run) memRuns.set(runId, { ...run, ...patch } as FlowRun);
  }
}

export async function listRuns(flowId: string, limit = 20): Promise<FlowRun[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase
      .from("pari_flow_runs")
      .select("*")
      .eq("flow_id", flowId)
      .order("started_at", { ascending: false })
      .limit(limit);
    return data || [];
  }
  return [...memRuns.values()]
    .filter((r) => r.flow_id === flowId)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);
}

// Seed default flows (called once on first GET if empty)
export async function seedDefaultFlows(): Promise<void> {
  const existing = await listFlows();
  if (existing.length > 0) return;

  const defaults: Omit<AutoFlow, "id" | "runs" | "created_at">[] = [
    {
      name: "Kunlik brifing",
      description: "Har kuni 09:00 da sabah xabarini Telegramga yuboradi",
      active: false,
      trigger_type: "schedule",
      trigger_config: { cron: "0 9 * * *" },
      nodes: [
        { id: "n1", kind: "trigger", type: "schedule", label: "Har kuni 09:00", config: { cron: "0 9 * * *" } },
        { id: "n2", kind: "action", type: "digest", label: "Brifing yaratish", config: {} },
        { id: "n3", kind: "action", type: "telegram", label: "Telegramga yuborish", config: { message: "{{digest}}" } },
        { id: "n4", kind: "output", type: "end", label: "Tugash", config: {} },
      ],
    },
    {
      name: "Webhook → Agent",
      description: "Tashqi xizmatdan kelgan webhook ni agent orqali ishlaydi",
      active: false,
      trigger_type: "webhook",
      trigger_config: { secret: uid() },
      nodes: [
        { id: "n1", kind: "trigger", type: "webhook", label: "Webhook trigger", config: {} },
        { id: "n2", kind: "action", type: "agent", label: "Assistant agent", config: { agentId: "assistant" } },
        { id: "n3", kind: "action", type: "telegram", label: "Natijani yuborish", config: {} },
        { id: "n4", kind: "output", type: "end", label: "Tugash", config: {} },
      ],
    },
    {
      name: "Oylik hisobot → Sheets",
      description: "Har oy moliyaviy hisobotni Google Sheets ga yuboradi",
      active: false,
      trigger_type: "schedule",
      trigger_config: { cron: "0 8 1 * *" },
      nodes: [
        { id: "n1", kind: "trigger", type: "schedule", label: "Har oy 1-sana 08:00", config: { cron: "0 8 1 * *" } },
        { id: "n2", kind: "action", type: "finance_report", label: "Moliyaviy hisobot", config: {} },
        { id: "n3", kind: "action", type: "sheets", label: "Google Sheets ga yoz", config: {} },
        { id: "n4", kind: "output", type: "end", label: "Tugash", config: {} },
      ],
    },
  ];

  for (const f of defaults) {
    await createFlow(f);
  }
}
