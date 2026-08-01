import { NextRequest, NextResponse } from "next/server";
import { saveTrace, findSimilarTraces, experienceContext, type TraceStep } from "@/lib/trace-memory";

// GET /api/traces?task=... — o'xshash tajribalar
export async function GET(req: NextRequest) {
  const task = req.nextUrl.searchParams.get("task") || "";
  if (!task) {
    return NextResponse.json({
      ok: true,
      description:
        "Experience Memory — muvaffaqiyatli agent/tool zanjirlarini saqlash va o'xshash so'rovlarda qayta ishlatish (OpenJarvis Trace Learning sodda versiyasi).",
      usage: {
        list: "GET ?task=savol",
        save: "POST { task, steps, answer?, success?, source? }",
      },
    });
  }
  const hits = await findSimilarTraces(task);
  const context = await experienceContext(task);
  return NextResponse.json({
    task,
    matches: hits.map((h) => ({
      id: h.trace.id,
      task: h.trace.task,
      score: h.score,
      source: h.trace.source,
      steps: h.trace.steps,
      answer: h.trace.answer,
    })),
    context,
  });
}

// POST — yangi trace saqlash
export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = String(body.task || "").trim();
  if (!task) return NextResponse.json({ error: "task kerak" }, { status: 400 });
  const steps = (Array.isArray(body.steps) ? body.steps : []) as TraceStep[];
  const trace = await saveTrace({
    task,
    steps,
    answer: body.answer,
    success: body.success,
    source: body.source,
  });
  return NextResponse.json({ trace });
}
