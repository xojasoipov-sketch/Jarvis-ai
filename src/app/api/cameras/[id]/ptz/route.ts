// POST /api/cameras/:id/ptz — { action: "move"|"stop"|"home"|"preset", direction?, preset?, speed? }
import { NextRequest, NextResponse } from "next/server";
import { ptzMove, ptzStop, ptzHome, ptzPreset } from "@/lib/camera/camera-service";
import type { PtzDirection } from "@/lib/camera/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { action?: string; direction?: PtzDirection; preset?: string; speed?: number };

  try {
    switch (body.action) {
      case "move":
        if (!body.direction) return NextResponse.json({ ok: false, error: "direction kerak" }, { status: 400 });
        return NextResponse.json({ ok: true, ...(await ptzMove(id, body.direction, body.speed)) });
      case "stop":
        return NextResponse.json({ ok: true, ...(await ptzStop(id)) });
      case "home":
        return NextResponse.json({ ok: true, ...(await ptzHome(id)) });
      case "preset":
        if (!body.preset) return NextResponse.json({ ok: false, error: "preset kerak" }, { status: 400 });
        return NextResponse.json({ ok: true, ...(await ptzPreset(id, body.preset)) });
      default:
        return NextResponse.json({ ok: false, error: "action: move | stop | home | preset" }, { status: 400 });
    }
  } catch (e) {
    const isUnsupported = e instanceof Error && e.name === "PTZ_UNSUPPORTED";
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "PTZ xatosi", code: isUnsupported ? "PTZ_UNSUPPORTED" : undefined },
      { status: isUnsupported ? 422 : 500 },
    );
  }
}
