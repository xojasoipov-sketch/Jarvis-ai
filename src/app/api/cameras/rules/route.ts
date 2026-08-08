import { NextRequest, NextResponse } from "next/server";
import { listRules, createRule, updateRule, deleteRule } from "@/lib/camera/camera-store";

export async function GET(req: NextRequest) {
  const camera_id = req.nextUrl.searchParams.get("camera_id") || undefined;
  const rules = await listRules(camera_id);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    camera_id?: string; name: string; trigger_type: string;
    trigger_config?: Record<string, unknown>; action_type: string;
    action_config?: Record<string, unknown>; schedule?: unknown;
  };
  const rule = await createRule({
    camera_id: body.camera_id || null,
    name: body.name,
    trigger_type: body.trigger_type as never,
    trigger_config: body.trigger_config || {},
    action_type: body.action_type as never,
    action_config: body.action_config || {},
    schedule: (body.schedule as never) || null,
    enabled: true,
  });
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; [k: string]: unknown };
  const { id, ...updates } = body;
  await updateRule(id, updates as never);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  await deleteRule(id);
  return NextResponse.json({ ok: true });
}
