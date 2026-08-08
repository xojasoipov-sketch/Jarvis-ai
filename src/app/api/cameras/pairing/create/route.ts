// POST /api/cameras/pairing/create — Mini App "+ Add Camera → Scan QR" bosganda
import { NextRequest, NextResponse } from "next/server";
import { createPairingSession } from "@/lib/camera/pairing";

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.APP_BASE_URL || new URL(req.url).origin;
    const payload = await createPairingSession(baseUrl);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Pairing session yaratilmadi" }, { status: 500 });
  }
}
