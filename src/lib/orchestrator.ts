// Jarvis Orchestrator — bitta maqsadni bosqichlarga bo'lib, tegishli agentlarga
// ketma-ket topshiradi (har bosqich avvalgi natijalarni ko'radi), so'ng
// hammasini yagona, izchil yakuniy javobga jamlaydi.
//
// Hermes (api/hermes) dan farqi: Hermes bitta topshiriqni mos agent(lar)ga
// PARALLEL yo'naltiradi va xom natijalarni qaytaradi. Orchestrator esa
// maqsadni REJALASHTIRIB, bosqichma-bosqich OXIRIGACHA bajaradi va yakunda
// bitta jamlangan javob beradi — "Foydalanuvchi maqsadini aytadi, qolganini
// Jarvis bajaradi" talabiga mos.
import { supabase, dbConfigured } from "./supabase";
import { AGENTS, callAI, type AgentId } from "./agents";

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

export type PlanStep = { agent_id: AgentId; task: string };
export type ExecutedStep = { agent_id: AgentId; agent_name: string; icon: string; task: string; result: string };

export type OrchestratorRun = {
  id: string;
  goal: string;
  steps: ExecutedStep[];
  final: string | null;
  status: "running" | "done" | "error";
  created_at: string;
};

const memRuns = new Map<string, OrchestratorRun>();

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const PLANNER_PROMPT = `Sen Jarvis Orchestrator — murakkab maqsadni bajariladigan bosqichlarga bo'lasan.

Mavjud agentlar:
${AGENT_IDS.map((id) => `- ${id}: ${AGENTS[id].name} — ${AGENTS[id].prompt.split("\n")[0]}`).join("\n")}

Qoidalar:
1. Maqsadni 2-5 ta mantiqiy, ketma-ket bosqichga bo'l (oddiy so'rov bo'lsa 1 bosqich yetarli).
2. Har bosqich uchun eng mos agentni tanla va aniq, bajarilishi mumkin bo'lgan sub-vazifa yoz.
3. Bosqichlar mantiqiy tartibda bo'lsin (masalan: research → coder → testing → devops).
4. FAQAT quyidagi JSON formatda javob ber, boshqa hech narsa yozma:
{"steps": [{"agent_id": "researcher", "task": "..."}, {"agent_id": "coder", "task": "..."}]}`;

async function planGoal(goal: string): Promise<PlanStep[]> {
  const raw = await callAI(PLANNER_PROMPT, goal);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const steps: PlanStep[] = (parsed.steps || [])
      .filter((s: { agent_id?: string; task?: string }) => s.agent_id && s.task && AGENT_IDS.includes(s.agent_id as AgentId))
      .map((s: { agent_id: string; task: string }) => ({ agent_id: s.agent_id as AgentId, task: s.task }));
    if (steps.length) return steps.slice(0, 5);
  } catch { /* fall through */ }
  return [{ agent_id: "assistant", task: goal }];
}

const SYNTHESIZER_PROMPT = `Sen Jarvis — bir nechta ixtisoslashgan agent natijalarini bitta izchil, foydalanuvchiga
tushunarli yakuniy javobga jamlaysan. Takrorlanishlarni olib tashla, ziddiyat bo'lsa eng ishonchli ma'lumotni tanla,
foydalanuvchining asl maqsadiga to'g'ridan-to'g'ri javob ber.`;

async function synthesize(goal: string, steps: ExecutedStep[]): Promise<string> {
  const combined = steps.map((s) => `[${s.agent_name}] Vazifa: ${s.task}\nNatija: ${s.result}`).join("\n\n");
  return callAI(SYNTHESIZER_PROMPT, `Asl maqsad: ${goal}\n\nBosqichlar natijalari:\n${combined}\n\nYakuniy, jamlangan javobni yoz.`);
}

/** To'liq orchestratsiya: rejalashtirish → bosqichma-bosqich bajarish → jamlash. Sinxron (natija tayyor bo'lgach qaytadi). */
export async function runOrchestrator(goal: string): Promise<OrchestratorRun> {
  const id = uid();
  const run: OrchestratorRun = { id, goal, steps: [], final: null, status: "running", created_at: new Date().toISOString() };
  memRuns.set(id, run);
  if (dbConfigured && supabase) {
    await supabase.from("pari_orchestrator_runs").insert({ id, goal, steps: [], status: "running" });
  }

  try {
    const plan = await planGoal(goal);
    let priorContext = "";

    for (const step of plan) {
      const agent = AGENTS[step.agent_id];
      const userMsg = priorContext ? `Oldingi bosqichlar konteksti:\n${priorContext}\n\nVazifa: ${step.task}` : step.task;
      const result = await callAI(agent.prompt, userMsg);
      const executed: ExecutedStep = { agent_id: step.agent_id, agent_name: agent.name, icon: agent.icon, task: step.task, result };
      run.steps.push(executed);
      priorContext += `[${agent.name}] ${step.task} → ${result.slice(0, 300)}\n`;
    }

    run.final = plan.length > 1 ? await synthesize(goal, run.steps) : run.steps[0]?.result || "";
    run.status = "done";
  } catch (e) {
    run.status = "error";
    run.final = `Xato yuz berdi: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (dbConfigured && supabase) {
    await supabase.from("pari_orchestrator_runs").update({ steps: run.steps, final: run.final, status: run.status }).eq("id", id);
  }
  return run;
}

export async function getOrchestratorRun(id: string): Promise<OrchestratorRun | null> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_orchestrator_runs").select("*").eq("id", id).single();
    return data || null;
  }
  return memRuns.get(id) || null;
}

export async function listOrchestratorRuns(limit = 20): Promise<OrchestratorRun[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_orchestrator_runs").select("*").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  }
  return [...memRuns.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}
