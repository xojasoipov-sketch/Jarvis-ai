import { NextRequest, NextResponse } from "next/server";
import { createPendingDevice, confirmDevice, type Platform } from "@/lib/device-store";
import { createDeviceToken, verifyAutoPairKey, autoPairConfigured } from "@/lib/device-auth";
import { log } from "@/lib/logger";
import { supabase, dbConfigured } from "@/lib/supabase";

// POST /api/devices/pair/auto — ilova birinchi ochilganda, QR/deep-link almashinuvisiz,
// APK ichiga qattiq yozilgan DEVICE_AUTO_PAIR_KEY orqali darhol pairlanadi.
// Header: Authorization: Bearer <DEVICE_AUTO_PAIR_KEY>
export async function POST(req: NextRequest) {
  if (!autoPairConfigured) {
    return NextResponse.json({ error: "DEVICE_AUTO_PAIR_KEY sozlanmagan" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !verifyAutoPairKey(token)) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, platform, model, os_version, app_version } = body;

  const deviceId = await createPendingDevice();
  const deviceToken = await createDeviceToken(deviceId);
  const validPlatforms: Platform[] = ["android", "ios", "windows", "macos", "linux"];
  const osInfo = [model, os_version, app_version ? `app ${app_version}` : null].filter(Boolean).join(" / ");

  const device = await confirmDevice(
    deviceId,
    {
      name: name || "Android qurilma",
      platform: validPlatforms.includes(platform) ? platform : "android",
      os_info: osInfo,
    },
    deviceToken
  );

  if (!device) {
    // Vaqtinchalik tashxis: /api/logs'ga login qilmasdan sababni ko'rish uchun.
    let probe: unknown = null;
    if (dbConfigured && supabase) {
      const { error } = await supabase.from("pari_devices").insert({
        id: "diag-" + deviceId, name: "diag", platform: "android", os_info: "", status: "offline", paired_at: new Date().toISOString(), revoked: false,
      });
      probe = error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : "insert_ok";
    }
    // Qaysi env o'zgaruvchi qaysi loyihaga tegishli ekanini aniqlaydi. Kalitning O'ZI
    // qaytarilmaydi — faqat JWT'ning ochiq claim'lari (ref = loyiha id, role, muddati).
    const CANDIDATES = [
      "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY2", "SUPABASE_SERVICE_KEY",
      "SUPABASE_SECRET_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_KEY",
    ];
    const keys = CANDIDATES.map((n) => {
      const v = process.env[n];
      if (!v) return { name: n, set: false };
      const parts = v.split(".");
      if (parts.length !== 3) return { name: n, set: true, format: v.startsWith("sb_") ? "sb_ (non-JWT)" : "unknown", len: v.length };
      try {
        const c = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        return { name: n, set: true, format: "jwt", ref: c.ref, role: c.role, expired: typeof c.exp === "number" && Date.now() / 1000 > c.exp };
      } catch { return { name: n, set: true, format: "jwt (unparseable)" }; }
    });
    const urls = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"]
      .map((n) => ({ name: n, value: process.env[n] || null }));
    return NextResponse.json(
      { error: "Qurilma yaratilmadi", debug: { dbConfigured, deviceId, probe, keys, urls } },
      { status: 500 }
    );
  }

  log("info", "devices", `Auto-pair: ${device.name} (${deviceId})`);
  return NextResponse.json({ ok: true, device_id: deviceId, device_token: deviceToken, name: device.name, device });
}
