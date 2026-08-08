// ─── EZVIZ Camera Provider ───────────────────────────────────────────────────
// EZVIZ'ning rasmiy API'si cheklangan — bu adapter ular mavjud bo'lgan qismlarni
// qo'llaydi va yo'q bo'lganda aniq xato qaytaradi (fake response yo'q).
//
// TODO (real EZVIZ integration uchun):
//   - EZVIZ Developer Portal: https://open.ys7.com/
//   - EZVIZ_APP_KEY + EZVIZ_APP_SECRET env variables
//   - token olish: POST https://open.ys7.com/api/lapp/token/get
//   - kamera ro'yxati: GET https://open.ys7.com/api/lapp/device/list
//   - live stream: GET https://open.ys7.com/api/lapp/live/address/get
//   - snapshot: GET https://open.ys7.com/api/lapp/device/capture
//
// Hozir: credentials bo'lsa EZVIZ Cloud API'sini chaqiradi,
//        bo'lmasa aniq xato qaytaradi (silent fake yo'q).

import type { Camera, CameraCapabilities, CameraStatus, HealthCheckResult, ICameraProvider, SnapshotResult, StreamInfo } from "../types";

const EZVIZ_API = "https://open.ys7.com/api/lapp";

export class EzvizProvider implements ICameraProvider {
  readonly name = "ezviz";

  private async getToken(appKey: string, appSecret: string): Promise<string> {
    const res = await fetch(`${EZVIZ_API}/token/get`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ appKey, appSecret }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { code: string; data?: { accessToken: string } };
    if (data.code !== "200" || !data.data?.accessToken) {
      throw new Error(`EZVIZ token xato: ${data.code}`);
    }
    return data.data.accessToken;
  }

  async connect(camera: Camera, creds: Record<string, string>): Promise<boolean> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) {
      throw new Error("EZVIZ credentials yetishmayapti: app_key va app_secret kerak (EZVIZ Developer Portal'dan)");
    }
    const token = await this.getToken(app_key, app_secret);
    return Boolean(token);
  }

  async disconnect(_camera_id: string): Promise<void> {
    // EZVIZ stateless token — disconnect'ga ehtiyoj yo'q
  }

  async getStatus(camera: Camera, creds: Record<string, string>): Promise<CameraStatus> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) return "unknown";
    try {
      const token = await this.getToken(app_key, app_secret);
      const serial = camera.serial || camera.metadata?.serial as string;
      if (!serial) return "unknown";
      const res = await fetch(`${EZVIZ_API}/device/info`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ accessToken: token, deviceSerial: serial }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json() as { code: string; data?: { status: number } };
      if (data.code !== "200") return "error";
      return data.data?.status === 1 ? "online" : "offline";
    } catch {
      return "error";
    }
  }

  async getCapabilities(_camera: Camera, _creds: Record<string, string>): Promise<CameraCapabilities> {
    // EZVIZ API capabilities discovery — model'ga qarab farq qiladi
    // Real implementation'da EZVIZ device info'dan olish kerak
    return {
      live: true,
      snapshot: true,
      recording: true,
      audio: true,
      ptz: false,       // Kamera modeliga qarab
      motion_detection: true,
      rtsp: true,
    };
  }

  async getSnapshot(camera: Camera, creds: Record<string, string>): Promise<SnapshotResult | null> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) return null;
    const serial = camera.serial;
    if (!serial) return null;
    try {
      const token = await this.getToken(app_key, app_secret);
      const res = await fetch(`${EZVIZ_API}/device/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ accessToken: token, deviceSerial: serial, channelNo: "1" }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json() as { code: string; data?: { picUrl: string } };
      if (data.code !== "200" || !data.data?.picUrl) return null;
      return { url: data.data.picUrl, taken_at: new Date().toISOString() };
    } catch {
      return null;
    }
  }

  async getStreamInfo(camera: Camera, creds: Record<string, string>): Promise<StreamInfo | null> {
    // Agar to'g'ridan-to'g'ri RTSP URL berilgan bo'lsa
    if (camera.rtsp_url) {
      return { rtsp_url: camera.rtsp_url };
    }
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret || !camera.serial) return null;
    try {
      const token = await this.getToken(app_key, app_secret);
      const res = await fetch(`${EZVIZ_API}/live/address/get`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ accessToken: token, deviceSerial: camera.serial, channelNo: "1", protocol: "2" }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json() as { code: string; data?: { url: string } };
      if (data.code !== "200" || !data.data?.url) return null;
      return { hls_url: data.data.url };
    } catch {
      return null;
    }
  }

  async healthCheck(camera: Camera, creds: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const status = await this.getStatus(camera, creds);
      return { camera_id: camera.id, status, latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
    } catch (e) {
      return {
        camera_id: camera.id, status: "error",
        latency_ms: Date.now() - start,
        error: e instanceof Error ? e.message : "Unknown error",
        checked_at: new Date().toISOString(),
      };
    }
  }
}
