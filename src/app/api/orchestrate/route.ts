import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator, listOrchestratorRuns } from "@/lib/orchestrator";
import { log } from "@/lib/logger";

// POST /api/orchestrate — maqsadni bosqichlarga bo'lib, tegishli agentlar bilan
// ketma-ket bajaradi va yakuniy jamlangan javob beradi ("Jarvis, buni bajar")
export async function POST(req: NextRequest) {
  const { goal } = await req.json().catch(() => ({}));
  if (!goal || typeof goal !== "string" || !goal.trim()) {
    return NextResponse.json({ error: "goal kerak" }, { status: 400 });
  }

  const run = await runOrchestrator(goal.trim());
  log("info", "orchestrator", `Maqsad bajarildi (${run.steps.length} bosqich): "${goal.slice(0, 60)}"`);
  return NextResponse.json(run);
}

// GET /api/orchestrate?history=1 — o'tgan orkestratsiyalar tarixi
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("history")) {
    const runs = await listOrchestratorRuns();
    return NextResponse.json({ runs });
  }
  return NextResponse.json({ ok: true, description: "Jarvis Orchestrator — maqsadni bosqichma-bosqich oxirigacha bajaradi" });
}
