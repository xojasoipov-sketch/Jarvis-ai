// POST /api/cameras/ezviz/connect
// EZVIZ accountga ulanish va kameralarni avtomatik import qilish
import { NextRequest, NextResponse } from "next/server";
import { syncEzvizAccount } from "@/lib/camera/ezviz-sync";

export async function POST(req: NextRequest) {
  const body = await req.json() as { app_key?: string; app_secret?: string };
  const app_key = (body.app_key || process.env.EZVIZ_APP_KEY || "").trim();
  const app_secret = (body.app_secret || process.env.EZVIZ_APP_SECRET || "").trim();

  if (!app_key || !app_secret) {
    return NextResponse.json({
      ok: false,
      error: "app_key va app_secret kerak. https://open.ys7.com da ilovangizdan oling.",
    }, { status: 400 });
  }

  // Secrets'ni logga chiqarmaslik — faqat key uzunligini ko'rsatamiz
  console.log(`[EZVIZ connect] appKey=***${app_key.slice(-4)}, len=${app_key.length}`);

  const result = await syncEzvizAccount(app_key, app_secret);

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    imported: result.imported,
    updated: result.updated,
    total: result.total,
    cameras: result.cameras,
    message: `EZVIZ ulandi. ${result.imported} ta yangi kamera import qilindi, ${result.updated} ta yangilandi.`,
  });
}

// GET /api/cameras/ezviz/connect — joriy EZVIZ holati
export async function GET() {
  const appKey = (process.env.EZVIZ_APP_KEY || "").trim();
  const appSecret = (process.env.EZVIZ_APP_SECRET || "").trim();

  const configured = Boolean(appKey && appSecret);
  const { listCameras } = await import("@/lib/camera/camera-store");
  const all = await listCameras();
  const ezvizCams = all.filter(c => c.provider === "ezviz");

  return NextResponse.json({
    configured,
    env_configured: configured,
    cameras_count: ezvizCams.length,
    online: ezvizCams.filter(c => c.status === "online").length,
    offline: ezvizCams.filter(c => c.status === "offline").length,
  });
}
