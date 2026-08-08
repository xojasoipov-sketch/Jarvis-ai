import { NextRequest, NextResponse } from "next/server";
import { listCameras, createCamera, deleteCamera } from "@/lib/camera/camera-store";
import { setCameraCredentials } from "@/lib/camera/camera-store";

export async function GET() {
  const cameras = await listCameras();
  return NextResponse.json({ cameras, count: cameras.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; provider: string; location: string; serial?: string; rtsp_url?: string; credentials?: Record<string, string> };
  const { name, provider, location, serial = "", rtsp_url = "", credentials } = body;
  if (!name || !provider || !location) {
    return NextResponse.json({ error: "name, provider va location kerak" }, { status: 400 });
  }
  const cam = await createCamera({
    name, provider: provider as never, location, serial, rtsp_url,
    capabilities: { live: false, snapshot: false, recording: false, audio: false, ptz: false, motion_detection: false, rtsp: Boolean(rtsp_url) },
    metadata: {}, enabled: true,
  });
  if (credentials && Object.keys(credentials).length) {
    await setCameraCredentials(cam.id, credentials);
  }
  return NextResponse.json({ camera: cam }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteCamera(id);
  return NextResponse.json({ ok: true });
}
