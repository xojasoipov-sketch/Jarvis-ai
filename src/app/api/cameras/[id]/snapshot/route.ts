import { NextRequest, NextResponse } from "next/server";
import { takeSnapshot } from "@/lib/camera/camera-service";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await takeSnapshot(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Snapshot olib bo'lmadi" }, { status: 500 });
  }
}
