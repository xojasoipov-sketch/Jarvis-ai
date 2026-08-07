import { NextRequest, NextResponse } from "next/server";
import { queueCommand, listCommandHistory } from "@/lib/device-store";
import { log } from "@/lib/logger";

// Ruxsat etilgan buyruqlar — android-agent/CommandExecutor.kt'dagi whitelist bilan bir xil
// bo'lishi shart. Yangi buyruq qo'shsangiz ikkalasiga ham qo'shing.
const ALLOWED_ACTIONS = new Set([
  // Qurilma holati
  "device_status", "battery_status", "storage_status", "ram_status",
  "network_status", "screen_info", "app_version_info",
  // Joylashuv va aloqa
  "get_location", "dial_number", "open_maps", "search_web",
  // Bildirishnoma / signal
  "send_notification", "vibrate", "toggle_flashlight",
  // Ovoz
  "set_volume", "get_volume",
  // Fayllar
  "get_files", "get_file_info", "read_text_file", "write_text_file",
  "delete_file", "create_folder", "rename_file", "copy_file", "download_file",
  // Buferga almashish
  "get_clipboard", "set_clipboard", "clipboard_sync",
  // Ilovalar
  "open_app", "open_url", "share_text", "open_settings", "set_alarm",
  "list_installed_apps",
  // Kamera / xotira / terminal
  "open_camera", "take_screenshot", "terminal_command",
  // Ilova ikonkasini yashirish/ko'rsatish
  "hide_app", "show_app",
  // OEM batareya/autostart sozlamalarini ochish
  "open_autostart_settings",
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
