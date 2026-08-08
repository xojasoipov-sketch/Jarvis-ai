// POST /api/cameras/ezviz/sync — EZVIZ accountdan kameralarni yangilash
import { NextResponse } from "next/server";
import { syncEzvizAccount, getGlobalEzvizCreds } from "@/lib/camera/ezviz-sync";

export async function POST() {
  const creds = await getGlobalEzvizCreds();
  if (!creds) {
    return NextResponse.json({
      ok: false,
      error: "EZVIZ hali ulanmagan. Avval /cameras/connect orqali ulaning yoki EZVIZ_APP_KEY + EZVIZ_APP_SECRET env'ga qo'shing.",
    }, { status: 400 });
  }

  const result = await syncEzvizAccount(creds.app_key, creds.app_secret);

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
