import { NextRequest, NextResponse } from "next/server";
import { getStreamInfo } from "@/lib/camera/camera-service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await getStreamInfo(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Stream olib bo'lmadi" }, { status: 500 });
  }
}
