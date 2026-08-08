// ─── Generic RTSP Provider ────────────────────────────────────────────────────
// To'g'ridan-to'g'ri RTSP URL mavjud kameralar uchun.
// FFmpeg gateway server (camera-gateway) orqali ishlaydi.

import type { Camera, CameraCapabilities, CameraStatus, HealthCheckResult, ICameraProvider, SnapshotResult, StreamInfo } from "../types";

const GATEWAY = process.env.CAMERA_GATEWAY_URL || "";

export class RtspProvider implements ICameraProvider {
  readonly name = "rtsp";

  async connect(camera: Camera, _creds: Record<string, string>): Promise<boolean> {
    if (!camera.rtsp_url) throw new Error("rtsp_url yetishmayapti");
    return true;
  }

  async disconnect(_camera_id: string): Promise<void> {
    if (GATEWAY) {
      await fetch(`${GATEWAY}/stream/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_id: _camera_id }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }
  }

  async getStatus(camera: Camera, _creds: Record<string, string>): Promise<CameraStatus> {
    if (!camera.rtsp_url) return "unknown";
    if (!GATEWAY) return "unknown"; // Gateway'siz status tekshirib bo'lmaydi
    try {
      const res = await fetch(`${GATEWAY}/stream/status?camera_id=${camera.id}`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json() as { status: CameraStatus };
      return data.status || "unknown";
    } catch { return "unknown"; }
  }

  async getCapabilities(_camera: Camera, _creds: Record<string, string>): Promise<CameraCapabilities> {
    return { live: true, snapshot: Boolean(GATEWAY), recording: Boolean(GATEWAY), audio: false, ptz: false, motion_detection: false, rtsp: true };
  }

  async getSnapshot(camera: Camera, _creds: Record<string, string>): Promise<SnapshotResult | null> {
    if (!GATEWAY || !camera.rtsp_url) return null;
    try {
      const res = await fetch(`${GATEWAY}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_id: camera.id, rtsp_url: camera.rtsp_url }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json() as { url?: string };
      if (!data.url) return null;
      return { url: data.url, taken_at: new Date().toISOString() };
    } catch { return null; }
  }

  async getStreamInfo(camera: Camera, _creds: Record<string, string>): Promise<StreamInfo | null> {
    if (camera.rtsp_url) return { rtsp_url: camera.rtsp_url };
    return null;
  }

  async healthCheck(camera: Camera, creds: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    const status = await this.getStatus(camera, creds);
    return { camera_id: camera.id, status, latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
  }
}
