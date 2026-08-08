// ─── EZVIZ Account Sync ───────────────────────────────────────────────────────
// EZVIZ accountdagi kameralarni Jarvis databasega import qiladi.
// Har safar:
//   1. EZVIZ'dan barcha qurilmalarni oladi
//   2. Yangi qurilmalarni qo'shadi
//   3. Mavjudlarini yangilaydi (nom, status)
//   4. O'chirilganlarini disabled qiladi

import { fetchEzvizDevices, EzvizError, type EzvizDevice } from "./providers/ezviz-provider";
import {
  listCameras, createCamera, updateCamera,
  setCameraCredentials, getCameraCredentials,
} from "./camera-store";
import type { Camera } from "./types";

export type SyncResult = {
  imported: number;
  updated: number;
  offline: number;
  total: number;
  cameras: Array<{ id: string; name: string; status: string; serial: string }>;
  error?: string;
};

// EZVIZ device → internal Camera model
function normalizeDevice(device: EzvizDevice, existingId?: string): Partial<Camera> & { serial: string } {
  const status = device.status === 1 ? "online" : "offline";
  return {
    id: existingId,
    name: device.deviceName || `EZVIZ ${device.deviceSerial.slice(-6)}`,
    provider: "ezviz",
    location: device.deviceName?.toLowerCase().includes("gate")
      ? "gate"
      : device.deviceName?.toLowerCase().includes("yard")
        ? "yard"
        : "home",
    serial: device.deviceSerial,
    rtsp_url: "",
    status: status as Camera["status"],
    last_seen: status === "online" ? new Date().toISOString() : null,
    capabilities: {
      live: true,
      snapshot: true,
      recording: false,
      audio: Boolean(device.supportAudio),
      ptz: Boolean(device.supportPtz),
      motion_detection: true,
      rtsp: false, // faqat user qo'lda rtsp_url berilganda
    },
    metadata: {
      device_type: device.deviceType || "",
      version: device.deviceVersion || "",
      support_ptz: Boolean(device.supportPtz),
      support_audio: Boolean(device.supportAudio),
      channels: device.channelNumber || 1,
      ezviz_serial: device.deviceSerial,
    },
    enabled: true,
  };
}

export async function syncEzvizAccount(appKey: string, appSecret: string): Promise<SyncResult> {
  if (!appKey || !appSecret) {
    return { imported: 0, updated: 0, offline: 0, total: 0, cameras: [], error: "appKey va appSecret kerak" };
  }

  // EZVIZ'dan qurilmalarni olamiz
  let ezvizDevices: EzvizDevice[];
  try {
    ezvizDevices = await fetchEzvizDevices(appKey, appSecret);
  } catch (e) {
    return {
      imported: 0, updated: 0, offline: 0, total: 0, cameras: [],
      error: e instanceof EzvizError ? e.message : (e instanceof Error ? e.message : "EZVIZ ulanish xatosi"),
    };
  }

  if (!ezvizDevices.length) {
    return { imported: 0, updated: 0, offline: 0, total: 0, cameras: [], error: "EZVIZ accountda hech qanday qurilma topilmadi. open.ys7.com da kameralarni appga qo'shing." };
  }

  // Mavjud kameralarni olamiz
  const existing = await listCameras();
  const bySerial = new Map<string, Camera>(
    existing.filter(c => c.provider === "ezviz" && c.serial)
           .map(c => [c.serial, c]),
  );

  let imported = 0;
  let updated = 0;
  const result: SyncResult["cameras"] = [];

  for (const dev of ezvizDevices) {
    const existing_cam = bySerial.get(dev.deviceSerial);
    const normalized = normalizeDevice(dev, existing_cam?.id);

    if (existing_cam) {
      // Update mavjud kamera
      await updateCamera(existing_cam.id, {
        name: normalized.name,
        status: normalized.status as Camera["status"],
        last_seen: normalized.last_seen,
        metadata: normalized.metadata,
        capabilities: normalized.capabilities,
      });
      // Credentials'ni yangilaymiz (app_key/app_secret o'zgargan bo'lishi mumkin)
      await setCameraCredentials(existing_cam.id, { app_key: appKey, app_secret: appSecret });
      result.push({ id: existing_cam.id, name: normalized.name!, status: normalized.status!, serial: dev.deviceSerial });
      updated++;
    } else {
      // Yangi kamera yaratamiz
      const cam = await createCamera({
        name: normalized.name!,
        provider: "ezviz",
        location: normalized.location!,
        serial: dev.deviceSerial,
        rtsp_url: "",
        capabilities: normalized.capabilities!,
        metadata: normalized.metadata!,
        enabled: true,
      });
      await setCameraCredentials(cam.id, { app_key: appKey, app_secret: appSecret });
      result.push({ id: cam.id, name: cam.name, status: normalized.status!, serial: dev.deviceSerial });
      imported++;
    }
  }

  const offline = result.filter(c => c.status === "offline").length;

  return {
    imported,
    updated,
    offline,
    total: result.length,
    cameras: result,
  };
}

// Barcha EZVIZ kameralarning credentials'ini olish (birinchi kameradan)
export async function getGlobalEzvizCreds(): Promise<{ app_key: string; app_secret: string } | null> {
  // Env'dan olish (production'da afzal)
  const appKey = process.env.EZVIZ_APP_KEY || "";
  const appSecret = process.env.EZVIZ_APP_SECRET || "";
  if (appKey && appSecret) return { app_key: appKey, app_secret: appSecret };

  // Database'dan olish (UI orqali ulanilganda)
  const cameras = await listCameras();
  const ezvizCam = cameras.find(c => c.provider === "ezviz" && c.serial);
  if (!ezvizCam) return null;
  const creds = await getCameraCredentials(ezvizCam.id);
  if (creds.app_key && creds.app_secret) {
    return { app_key: creds.app_key, app_secret: creds.app_secret };
  }
  return null;
}
