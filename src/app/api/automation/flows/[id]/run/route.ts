import { NextRequest, NextResponse } from "next/server";
import { getFlow } from "@/lib/automation-store";
import { runFlow } from "@/lib/flow-runner";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flow = await getFlow(id);
  if (!flow) return NextResponse.json({ error: "Flow topilmadi" }, { status: 404 });
  if (!flow.active) return NextResponse.json({ error: "Flow o'chirilgan" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const result = await runFlow(flow, "manual", body.input || "");
  return NextResponse.json(result);
}
