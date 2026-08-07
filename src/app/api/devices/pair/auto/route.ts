import { NextRequest, NextResponse } from "next/server";
import {
  createPendingDevice, confirmDevice, queueCommand, listCommandHistory,
  findDeviceByHardwareId, setHardwareId, type Platform,
} from "@/lib/device-store";
import { createDeviceToken, verifyAutoPairKey, autoPairConfigured } from "@/lib/device-auth";
import { log } from "@/lib/logger";
import { sendMessage } from "@/lib/telegram";
import { OWNER } from "@/lib/owner";

/**
 * Pairing muvaffaqiyatli bo'lgach, qurilmani darhol o'z-o'zini tekshirishga
 * majburlaydi (device_status) va natija kelishi bilan (yoki 10s ichida
 * kelmasa) egasiga Telegram orqali xabar beradi — "ulandi va sozlandi"
 * degan tasdiqni ko'rish uchun dashboard'ni ochish shart emas. Javobni
 * bloklamasligi uchun fire-and-forget (await qilinmaydi).
 */
function notifyOwnerWhenReady(deviceId: string, deviceName: string, osInfo: string): void {
  void (async () => {
    try {
      const cmd = await queueCommand(deviceId, "device_status", {});
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 700));
        const history = await listCommandHistory(deviceId, 5);
        const found = history.find((c) => c.id === cmd.id);
        if (found && (found.status === "done" || found.status === "error")) {
          let statusLine = "";
          if (found.status === "done" && found.result) {
            try {
              const parsed = typeof found.result === "string" ? JSON.parse(found.result) : found.result;
              const battery = parsed?.battery ?? "?";
              const freeMb = parsed?.storage_free_mb ?? "?";
              statusLine = `\n🔋 ${battery}% · 💾 ${freeMb}MB bo'sh joy`;
            } catch { /* natija JSON emas — statusLine bo'sh qoladi */ }
          }
          await sendMessage(
            OWNER.telegramId,
            `🤖 Jarvis Agent ulandi va sozlandi: ${deviceName}\n${osInfo}${statusLine}\n\n` +
              `~40 buyruq faol — holat, joylashuv, fayllar, bildirishnoma, tovush, fonarcha va h.k. ` +
              `Endi shu qurilmaga yozib yoki gapirib buyruq bera olasiz.`
          );
          return;
        }
      }
      await sendMessage(
        OWNER.telegramId,
        `🤖 Jarvis Agent ulandi: ${deviceName}\nHolat tekshiruvi hali javob bermadi — fon xizmati ` +
          `ishga tushayotgan bo'lishi mumkin, bir ozdan keyin qayta urinib ko'ring.`
      );
    } catch (err) {
      log("warn", "devices", `notifyOwnerWhenReady: ${(err as Error).message}`);
    }
  })();
}

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
  const { name, platform, model, os_version, app_version, hardware_id } = body;

  // Ayni telefon oldin ulangan bo'lsa — YANGI qurilma yaratmaymiz, mavjudini
  // qayta ishlatamiz. Busiz har ulanishda dashboard'da dublikat paydo bo'lardi.
  const existing = hardware_id ? await findDeviceByHardwareId(String(hardware_id)) : null;
  const deviceId = existing?.id ?? (await createPendingDevice());
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

  if (!device) return NextResponse.json({ error: "Qurilma yaratilmadi" }, { status: 500 });

  if (hardware_id) await setHardwareId(deviceId, String(hardware_id));

  log("info", "devices", `Auto-pair: ${device.name} (${deviceId})${existing ? " [mavjud qurilma qayta ishlatildi]" : " [yangi]"}`);
  notifyOwnerWhenReady(deviceId, device.name, osInfo);
  return NextResponse.json({ ok: true, device_id: deviceId, device_token: deviceToken, name: device.name, device });
}
