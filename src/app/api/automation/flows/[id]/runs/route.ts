import { NextRequest, NextResponse } from "next/server";
import { listRuns } from "@/lib/automation-store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runs = await listRuns(id, 30);
  return NextResponse.json({ runs });
}
