import { NextRequest, NextResponse } from "next/server";
import { getFlow, updateFlow, deleteFlow } from "@/lib/automation-store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flow = await getFlow(id);
  if (!flow) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const flow = await updateFlow(id, body);
  if (!flow) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteFlow(id);
  return NextResponse.json({ ok: true });
}
