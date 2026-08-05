import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/agents";
import { getAllTools, runAnyTool } from "@/lib/mcp-tools";
import { experienceContext, saveTrace, type TraceStep } from "@/lib/trace-memory";
import { log } from "@/lib/logger";

/**
 * Multi-step ReAct + Experience Memory + MCP tools
 * OpenJarvis: Thought → Action → Observation → Final + tajribadan o'rganish
 */

const ALL_TOOLS = () => getAllTools();
const TOOL_NAMES = () => ALL_TOOLS().map((t) => t.name);
const TOOL_LIST = () => ALL_TOOLS().map((t) => `- ${t.name}: ${t.description}`).join("\n");

function buildSystem() {
  return `Sen ReAct agentisan (Reason + Act).
Har qadamda FAQAT quyidagi formatlardan BIRINI yoz:

Thought: <qisqa fikr>
Action: <tool_name>
Action Input: <JSON args>

YOKI yakuniy javob:
Thought: <yakuniy fikr>
Final Answer: <foydalanuvchiga to'liq javob>

Mavjud tool'lar:
${TOOL_LIST()}

Qoidalar:
1. Kerak bo'lsa tool chaqir
2. Maksimal 4 tool chaqiruv
3. O'zbek tilida javob ber (agar savol o'zbekcha bo'lsa)
4. Action Input faqat haqiqiy JSON
5. Noma'lum tool ishlatma`;
}

function parseReact(raw: string): {
  thought?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  final?: string;
} {
  const thought = raw.match(/Thought:\s*([\s\S]*?)(?=\nAction:|\nFinal Answer:|$)/i)?.[1]?.trim();
  const final = raw.match(/Final Answer:\s*([\s\S]*)$/i)?.[1]?.trim();
  const action = raw.match(/Action:\s*(\S+)/i)?.[1]?.trim();
  let actionInput: Record<string, unknown> | undefined;
  const inputMatch = raw.match(/Action Input:\s*([\s\S]*?)(?=\nThought:|\nFinal Answer:|$)/i);
  if (inputMatch) {
    try {
      const j = inputMatch[1].trim();
      const m = j.match(/\{[\s\S]*\}/);
      actionInput = JSON.parse(m ? m[0] : j);
    } catch {
      actionInput = { query: inputMatch[1].trim() };
    }
  }
  return { thought, action, actionInput, final };
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { task, max_steps = 4 } = await req.json();
    const goal = String(task || "").trim();
    if (!goal) return NextResponse.json({ error: "task kerak" }, { status: 400 });

    // Experience memory — o'xshash muvaffaqiyatli zanjir
    const exp = await experienceContext(goal);
    const steps: TraceStep[] = [];
    let transcript =
      `Foydalanuvchi vazifasi: ${goal}\n\n` +
      (exp ? `--- O'XSHASH TAJRIBA (o'rganish) ---\n${exp}\n--- /TAJRIBA ---\n\n` : "");
    let finalAnswer = "";
    const limit = Math.min(Number(max_steps) || 4, 6);
    const names = TOOL_NAMES();

    for (let i = 0; i < limit; i++) {
      const raw = await callAI(buildSystem(), transcript + "Keyingi qadamni yoz.");
      const parsed = parseReact(raw);

      if (parsed.thought) {
        steps.push({ type: "thought", content: parsed.thought });
        transcript += `Thought: ${parsed.thought}\n`;
      }

      if (parsed.final) {
        steps.push({ type: "final", content: parsed.final });
        finalAnswer = parsed.final;
        break;
      }

      if (parsed.action && names.includes(parsed.action)) {
        const input = parsed.actionInput || {};
        steps.push({ type: "action", tool: parsed.action, input });
        transcript += `Action: ${parsed.action}\nAction Input: ${JSON.stringify(input)}\n`;

        let observation: string;
        try {
          const result = await runAnyTool(parsed.action, input);
          observation = JSON.stringify(result).slice(0, 2000);
        } catch (e) {
          observation = `Xato: ${String(e)}`;
        }
        steps.push({ type: "observation", content: observation });
        transcript += `Observation: ${observation}\n\n`;
      } else if (parsed.action) {
        const obs = `Noma'lum tool: ${parsed.action}. Mavjud: ${names.join(", ")}`;
        steps.push({ type: "observation", content: obs });
        transcript += `Observation: ${obs}\n\n`;
      } else {
        finalAnswer =
          raw.replace(/^Thought:[\s\S]*?(?=Final Answer:|$)/i, "").replace(/Final Answer:\s*/i, "").trim() ||
          raw;
        steps.push({ type: "final", content: finalAnswer });
        break;
      }
    }

    if (!finalAnswer) {
      finalAnswer = await callAI(
        "Qisqa va aniq yakuniy javob yoz.",
        `Vazifa: ${goal}\n\nJarayon:\n${transcript}\n\nFinal Answer yoz.`
      );
      steps.push({ type: "final", content: finalAnswer });
    }

    // Trace saqlash (tajribadan o'rganish)
    await saveTrace({
      task: goal,
      steps,
      answer: finalAnswer,
      success: true,
      source: "react",
    });

    const ms = Date.now() - start;
    log("info", "react", `ReAct (${ms}ms, ${steps.length} steps, exp=${!!exp}): "${goal.slice(0, 50)}"`);

    return NextResponse.json({
      task: goal,
      answer: finalAnswer,
      steps,
      meta: {
        latency_ms: ms,
        step_count: steps.length,
        experience_used: !!exp,
        tools_available: names.length,
      },
    });
  } catch (e) {
    log("error", "react", String(e));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description:
      "Multi-step ReAct + Experience Memory + MCP tools. OpenJarvis uslubida.",
    tools: TOOL_NAMES(),
    usage: { method: "POST", body: { task: "string", max_steps: "number" } },
  });
}
