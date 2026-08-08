import { NextRequest, NextResponse } from "next/server";
import { listZones, createZone, updateZone, deleteZone } from "@/lib/camera/camera-store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zones = await listZones(id);
  return NextResponse.json({ zones });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { name: string; zone_type?: string; polygon?: unknown[] };
  const zone = await createZone({
    camera_id: id,
    name: body.name,
    zone_type: (body.zone_type as never) || "normal",
    polygon: (body.polygon as [number, number][]) || [],
    enabled: true,
  });
  return NextResponse.json({ zone }, { status: 201 });
}
