import { NextRequest, NextResponse } from "next/server";
import { runRuflo } from "@/lib/ruflo/client";

/**
 * Ruflo orchestration endpoint.
 * Keeps existing ReAct flow untouched.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = String(body.task || "").trim();

    if (!task) {
      return NextResponse.json({ error: "task kerak" }, { status: 400 });
    }

    const result = await runRuflo({
      task,
      context: body.context || {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Jarvis Ruflo Orchestrator",
  });
}
