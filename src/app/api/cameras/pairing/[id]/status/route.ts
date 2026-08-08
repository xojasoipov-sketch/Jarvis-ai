// GET /api/cameras/pairing/:id/status — Mini App pairing holatini poll qiladi
import { NextRequest, NextResponse } from "next/server";
import { getPairingStatus } from "@/lib/camera/pairing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPairingStatus(id);
  if (!result) return NextResponse.json({ ok: false, error: "Pairing session topilmadi" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
