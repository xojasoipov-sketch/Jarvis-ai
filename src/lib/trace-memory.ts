// Experience / Trace Memory — OpenJarvis Local Trace Learning ilhomida (sodda versiya).
// Muvaffaqiyatli agent/tool zanjirlarini saqlaydi va o'xshash so'rovlarda qayta ishlatadi.
import { supabase, dbConfigured } from "./supabase";

export type TraceStep = {
  type: "thought" | "action" | "observation" | "final" | "agent";
  content?: string;
  tool?: string;
  agent?: string;
  input?: Record<string, unknown>;
};

export type ExperienceTrace = {
  id: string;
  task: string;
  task_norm: string;
  steps: TraceStep[];
  answer?: string;
  success: boolean;
  source: "react" | "hermes" | "research" | "manual";
  created_at: string;
};

const mem: ExperienceTrace[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** So'rovni solishtirish uchun normalizatsiya */
export function normalizeTask(task: string): string {
  return task
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Oddiy token overlap o'xshashlik (0..1) */
export function similarity(a: string, b: string): number {
  const ta = new Set(normalizeTask(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(normalizeTask(b).split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

export async function saveTrace(input: {
  task: string;
  steps: TraceStep[];
  answer?: string;
  success?: boolean;
  source?: ExperienceTrace["source"];
}): Promise<ExperienceTrace> {
  const row: ExperienceTrace = {
    id: uid(),
    task: input.task.slice(0, 500),
    task_norm: normalizeTask(input.task),
    steps: input.steps.slice(0, 20),
    answer: input.answer?.slice(0, 4000),
    success: input.success !== false,
    source: input.source || "manual",
    created_at: new Date().toISOString(),
  };

  if (dbConfigured && supabase) {
    try {
      await supabase.from("pari_traces").insert({
        id: row.id,
        task: row.task,
        task_norm: row.task_norm,
        steps: row.steps,
        answer: row.answer,
        success: row.success,
        source: row.source,
        created_at: row.created_at,
      });
    } catch {
      /* jadval yo'q bo'lsa memoryga yozamiz */
    }
  }

  mem.unshift(row);
  if (mem.length > 200) mem.pop();
  return row;
}

export async function findSimilarTraces(
  task: string,
  opts: { minScore?: number; limit?: number } = {}
): Promise<{ trace: ExperienceTrace; score: number }[]> {
  const minScore = opts.minScore ?? 0.35;
  const limit = opts.limit ?? 3;
  const candidates: ExperienceTrace[] = [...mem];

  if (dbConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("pari_traces")
        .select("*")
        .eq("success", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data?.length) {
        for (const r of data as ExperienceTrace[]) {
          if (!candidates.find((c) => c.id === r.id)) candidates.push(r);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return candidates
    .map((trace) => ({ trace, score: similarity(task, trace.task) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** O'xshash tajribadan kontekst matni (promptga qo'shish uchun) */
export async function experienceContext(task: string): Promise<string> {
  const hits = await findSimilarTraces(task, { minScore: 0.4, limit: 2 });
  if (!hits.length) return "";
  return hits
    .map(({ trace, score }, i) => {
      const stepsBrief = trace.steps
        .slice(0, 6)
        .map((s) => {
          if (s.type === "action") return `  - tool: ${s.tool}`;
          if (s.type === "agent") return `  - agent: ${s.agent}`;
          if (s.type === "final") return `  - javob: ${(s.content || "").slice(0, 120)}`;
          return `  - ${s.type}`;
        })
        .join("\n");
      return `[Tajriba ${i + 1} · o'xshashlik ${(score * 100).toFixed(0)}%]\nVazifa: ${trace.task}\nQadamlar:\n${stepsBrief}\nJavob qisqacha: ${(trace.answer || "").slice(0, 200)}`;
    })
    .join("\n\n");
}
