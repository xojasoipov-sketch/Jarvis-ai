import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/camera/camera-store";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const events = await searchEvents({
    camera_id: p.get("camera_id") || undefined,
    event_type: (p.get("event_type") as never) || undefined,
    from: p.get("from") || undefined,
    to: p.get("to") || undefined,
    limit: p.get("limit") ? Number(p.get("limit")) : 50,
  });
  return NextResponse.json({ events, count: events.length });
}
