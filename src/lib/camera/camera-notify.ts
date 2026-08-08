// ─── Camera Alert Notification System ─────────────────────────────────────────
// Hodisalar uchun Telegram xabarnoma yuboradi. Smart debounce va rate limit.

import { ENV } from "@/lib/env";
import type { Camera, CameraEvent } from "./types";
import { markEventNotified } from "./camera-store";

const SEVERITY_EMOJI: Record<string, string> = {
  low: "ℹ️",
  medium: "⚠️",
  high: "🚨",
  critical: "🔴",
};

const EVENT_EMOJI: Record<string, string> = {
  person_detected: "👤",
  vehicle_detected: "🚗",
  animal_detected: "🐾",
  motion_detected: "🌀",
  camera_offline: "📵",
  camera_online: "📡",
  restricted_zone: "🚫",
  suspicious_activity: "⚠️",
  package_detected: "📦",
};

// Notification rate limiting — camera başına son notification vaqtini saqlash
const lastNotified = new Map<string, number>();
const COOLDOWN_MS: Record<string, number> = {
  low: 300_000,      // 5 daqiqa
  medium: 60_000,    // 1 daqiqa
  high: 15_000,      // 15 soniya
  critical: 0,        // doim
};

function canNotify(camera_id: string, severity: string): boolean {
  const key = `${camera_id}:${severity}`;
  const last = lastNotified.get(key) || 0;
  const cooldown = COOLDOWN_MS[severity] ?? 60_000;
  return Date.now() - last > cooldown;
}

function markNotified(camera_id: string, severity: string) {
  lastNotified.set(`${camera_id}:${severity}`, Date.now());
}

export async function sendCameraAlert(camera: Camera, event: CameraEvent): Promise<boolean> {
  if (!canNotify(camera.id, event.severity)) return false;

  const token = ENV.telegram();
  const chatId = process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const sevEmoji = SEVERITY_EMOJI[event.severity] || "📷";
  const evtEmoji = EVENT_EMOJI[event.event_type] || "📷";
  const timeStr = new Date(event.started_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const objectsList = event.objects.length
    ? event.objects.map(o => `  • ${o.type} (${Math.round(o.confidence * 100)}%)`).join("\n")
    : "";

  const text = [
    `${sevEmoji} <b>JARVIS KAMERA XABARNOMASI</b>`,
    ``,
    `${evtEmoji} <b>${event.event_type.replace(/_/g, " ").toUpperCase()}</b>`,
    `📷 Kamera: <b>${camera.name}</b>`,
    `📍 Joylashuv: ${camera.location}`,
    `⏱ Vaqt: ${timeStr}`,
    event.severity !== "low" ? `🎯 Daraja: <b>${event.severity.toUpperCase()}</b>` : "",
    objectsList ? `\nAniqlangan:\n${objectsList}` : "",
    event.ai_summary ? `\n💬 ${event.ai_summary}` : "",
  ].filter(Boolean).join("\n");

  const keyboard = {
    inline_keyboard: [[
      { text: "📸 Ko'rish", callback_data: `cam:view:${camera.id}` },
      { text: "📊 Tahlil", callback_data: `cam:analyze:${camera.id}` },
      { text: "🔕 O'chirish", callback_data: `cam:mute:${camera.id}` },
    ]],
  };

  try {
    // Snapshot bor bo'lsa rasm yuborish
    if (event.snapshot_url) {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: event.snapshot_url, caption: text, parse_mode: "HTML", reply_markup: keyboard }),
        signal: AbortSignal.timeout(15000),
      });
      const photoData = await photoRes.json() as { ok: boolean };
      if (photoData.ok) {
        markNotified(camera.id, event.severity);
        await markEventNotified(event.id);
        return true;
      }
    }

    // Fallback: matn xabar
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: keyboard }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { ok: boolean };
    if (data.ok) {
      markNotified(camera.id, event.severity);
      await markEventNotified(event.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function sendOfflineAlert(camera: Camera): Promise<boolean> {
  if (!canNotify(camera.id, "high")) return false;
  const token = ENV.telegram();
  const chatId = process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const text = `📵 <b>Kamera offline</b>\n\n📷 ${camera.name}\n📍 ${camera.location}\n⏱ ${new Date().toLocaleTimeString("uz-UZ")}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { ok: boolean };
    if (data.ok) { markNotified(camera.id, "high"); return true; }
    return false;
  } catch { return false; }
}
