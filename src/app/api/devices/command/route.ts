import { NextRequest, NextResponse } from "next/server";
import { queueCommand, listCommandHistory } from "@/lib/device-store";
import { log } from "@/lib/logger";

// Spetsifikatsiyada qo'llab-quvvatlanadigan buyruqlar ro'yxati
const ALLOWED_ACTIONS = new Set([
  "device_status", "battery_status", "get_location", "take_screenshot",
  "send_notification", "vibrate", "open_camera", "get_files",
  "upload_file", "download_file", "terminal_command",
]);

// POST /api/devices/command — Dashboarddan qurilmaga buyruq yuborish (Jarvis Dashboard "Send command")
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_id, action, payload } = body;

  if (!device_id || !action) return NextResponse.json({ error: "device_id va action kerak" }, { status: 400 });
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Ruxsat etilmagan buyruq: ${action}` }, { status: 400 });
  }

  const cmd = await queueCommand(device_id, action, payload || {});
  log("info", "devices", `Buyruq navbatga qo'yildi: ${action} → ${device_id}`);
  return NextResponse.json({ ok: true, command: cmd });
}

// GET /api/devices/command?device_id=... — buyruqlar tarixi (View logs)
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id");
  if (!deviceId) return NextResponse.json({ error: "device_id kerak" }, { status: 400 });
  const commands = await listCommandHistory(deviceId);
  return NextResponse.json({ commands });
}
