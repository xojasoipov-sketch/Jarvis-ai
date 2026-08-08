import { NextRequest, NextResponse } from "next/server";
import { getCamera, updateCamera, deleteCamera, setCameraCredentials } from "@/lib/camera/camera-store";
import { getCameraStatus } from "@/lib/camera/camera-service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cam = await getCamera(id);
  if (!cam) return NextResponse.json({ error: "Kamera topilmadi" }, { status: 404 });
  return NextResponse.json({ camera: cam });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const { credentials, ...updates } = body as { credentials?: Record<string, string>; [k: string]: unknown };
  await updateCamera(id, updates as never);
  if (credentials) await setCameraCredentials(id, credentials);
  const cam = await getCamera(id);
  return NextResponse.json({ camera: cam });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCamera(id);
  return NextResponse.json({ ok: true });
}
