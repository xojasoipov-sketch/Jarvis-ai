import { NextRequest, NextResponse } from "next/server";
import { listFlows, createFlow, seedDefaultFlows } from "@/lib/automation-store";

export async function GET() {
  await seedDefaultFlows();
  const flows = await listFlows();
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, description, nodes, trigger_type, trigger_config, active } = body;
  if (!name || !nodes) {
    return NextResponse.json({ error: "name va nodes kerak" }, { status: 400 });
  }
  const flow = await createFlow({
    name,
    description: description || "",
    nodes,
    trigger_type: trigger_type || "manual",
    trigger_config: trigger_config || {},
    active: active ?? true,
  });
  return NextResponse.json(flow, { status: 201 });
}
