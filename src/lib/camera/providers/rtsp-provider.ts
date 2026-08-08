// ─── Generic RTSP/ONVIF Provider ──────────────────────────────────────────────
// QR pairing orqali qo'shilgan kameralar (provider="rtsp") uchun. Haqiqiy
// video/snapshot ishi Camera Gateway'da bajariladi (../../../camera-gateway) —
// bu klass gateway'ga so'rov yuborib natijani olib keladi.
//
// CAMERA_GATEWAY_URL — gateway'ning cloud'dan yetadigan manzili. Gateway
// o'zi uy tarmog'ida turadi va odatda to'g'ridan-to'g'ri internetga ochiq
// bo'lmaydi (30-band) — shuning uchun bu URL amalda Cloudflare Tunnel /
// Tailscale Funnel / ngrok kabi operator o'zi sozlagan tunnel manzili bo'lishi
// kerak (gateway/README.md'ga qarang).
//
// CAMERA_GATEWAY_SECRET — cloud↔gateway o'rtasidagi shared-secret auth
// (bearer token). Gateway HTTP server yozilganda shu tokenni tekshirishi shart.

import type { Camera, CameraCapabilities, CameraStatus, HealthCheckResult, ICameraProvider, PtzDirection, SnapshotResult, StreamInfo } from "../types";

const GATEWAY = process.env.CAMERA_GATEWAY_URL || "";
const GATEWAY_SECRET = process.env.CAMERA_GATEWAY_SECRET || "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (GATEWAY_SECRET) headers.Authorization = `Bearer ${GATEWAY_SECRET}`;
  return headers;
}

// Pairing orqali qo'shilgan kamera uchun kerakli identifikatorlar
// (camera.metadata ichida ezviz-sync.ts'dagi normalizatsiyaga o'xshab saqlanadi,
// qarang: /api/cameras/pairing/confirm/route.ts)
function gatewayTarget(camera: Camera, creds: Record<string, string>) {
  const gateway_id = (camera.metadata?.gateway_id as string) || creds.gateway_id || "";
  const local_device_id = (camera.metadata?.local_device_id as string) || camera.serial || "";
  return {
    gateway_id,
    local_device_id,
    ip: (camera.metadata?.ip as string) || "",
    username: creds.username || "",
    password: creds.password || "",
  };
}

export class RtspProvider implements ICameraProvider {
  readonly name = "rtsp";

  async connect(camera: Camera, creds: Record<string, string>): Promise<boolean> {
    if (camera.rtsp_url) return true; // Qo'lda kiritilgan to'g'ridan-to'g'ri RTSP URL
    const target = gatewayTarget(camera, creds);
    if (!target.gateway_id || !target.local_device_id) {
      throw new Error("Kamera gateway_id/local_device_id yo'q — pairing orqali qo'shilmagan bo'lishi mumkin");
    }
    return true;
  }

  async disconnect(camera_id: string): Promise<void> {
    if (!GATEWAY) return;
    await fetch(`${GATEWAY}/stream/stop`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ camera_id }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }

  async getStatus(camera: Camera, creds: Record<string, string>): Promise<CameraStatus> {
    if (!GATEWAY) return "unknown"; // Gateway'siz status tekshirib bo'lmaydi
    const target = gatewayTarget(camera, creds);
    try {
      const res = await fetch(`${GATEWAY}/stream/status`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ camera_id: camera.id, ...target }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return "unknown";
      const data = await res.json() as { status: CameraStatus };
      return data.status || "unknown";
    } catch { return "unknown"; }
  }

  async getCapabilities(camera: Camera, _creds: Record<string, string>): Promise<CameraCapabilities> {
    // Pairing paytida ONVIF discovery'dan olingan capability'lar bo'lsa ularni ustun qo'yamiz
    if (camera.capabilities) return camera.capabilities;
    return { live: true, snapshot: Boolean(GATEWAY), recording: Boolean(GATEWAY), audio: false, ptz: false, motion_detection: false, rtsp: true };
  }

  async getSnapshot(camera: Camera, creds: Record<string, string>): Promise<SnapshotResult | null> {
    if (!GATEWAY) return null;
    const target = gatewayTarget(camera, creds);
    if (!camera.rtsp_url && !target.local_device_id) return null;
    try {
      const res = await fetch(`${GATEWAY}/snapshot`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ camera_id: camera.id, rtsp_url: camera.rtsp_url || undefined, ...target }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { url?: string };
      if (!data.url) return null;
      return { url: data.url, taken_at: new Date().toISOString() };
    } catch { return null; }
  }

  async getStreamInfo(camera: Camera, creds: Record<string, string>): Promise<StreamInfo | null> {
    if (camera.rtsp_url) return { rtsp_url: camera.rtsp_url };
    if (!GATEWAY) return null;
    const target = gatewayTarget(camera, creds);
    if (!target.local_device_id) return null;
    try {
      const res = await fetch(`${GATEWAY}/stream/start`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ camera_id: camera.id, ...target }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { hls_url?: string; expires_at?: string };
      if (!data.hls_url) return null;
      return { hls_url: data.hls_url, expires_at: data.expires_at };
    } catch { return null; }
  }

  async healthCheck(camera: Camera, creds: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    const status = await this.getStatus(camera, creds);
    return { camera_id: camera.id, status, latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
  }

  // ─── PTZ (faqat camera.capabilities.ptz=true bo'lganda chaqirilishi kerak) ──
  async ptzMove(camera: Camera, creds: Record<string, string>, direction: PtzDirection, speed = 0.5): Promise<void> {
    if (!GATEWAY) throw new Error("CAMERA_GATEWAY_URL sozlanmagan");
    const target = gatewayTarget(camera, creds);
    const res = await fetch(`${GATEWAY}/ptz/move`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ camera_id: camera.id, direction, speed, ...target }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`PTZ move muvaffaqiyatsiz: ${(await res.json().catch(() => ({ error: res.status }))).error}`);
  }

  async ptzStop(camera: Camera, creds: Record<string, string>): Promise<void> {
    if (!GATEWAY) return;
    const target = gatewayTarget(camera, creds);
    await fetch(`${GATEWAY}/ptz/stop`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ camera_id: camera.id, ...target }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }

  async ptzHome(camera: Camera, creds: Record<string, string>): Promise<void> {
    if (!GATEWAY) throw new Error("CAMERA_GATEWAY_URL sozlanmagan");
    const target = gatewayTarget(camera, creds);
    const res = await fetch(`${GATEWAY}/ptz/home`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ camera_id: camera.id, ...target }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("PTZ home muvaffaqiyatsiz");
  }

  async ptzPreset(camera: Camera, creds: Record<string, string>, preset: string): Promise<void> {
    if (!GATEWAY) throw new Error("CAMERA_GATEWAY_URL sozlanmagan");
    const target = gatewayTarget(camera, creds);
    const res = await fetch(`${GATEWAY}/ptz/preset`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ camera_id: camera.id, preset, ...target }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`PTZ preset "${preset}" topilmadi yoki muvaffaqiyatsiz`);
  }
}
