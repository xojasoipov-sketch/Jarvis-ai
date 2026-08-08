// ─── Mock Camera Provider ─────────────────────────────────────────────────────
// Development/test muhiti uchun. Production'da CAMERA_MOCK_ENABLED=false bo'lsa
// bu provider ishlatilmaydi.

import type { Camera, CameraCapabilities, CameraStatus, HealthCheckResult, ICameraProvider, SnapshotResult, StreamInfo } from "../types";

const MOCK_SNAPSHOT = "https://picsum.photos/seed/cam/1280/720";

export class MockCameraProvider implements ICameraProvider {
  readonly name = "mock";

  async connect(_camera: Camera, _creds: Record<string, string>): Promise<boolean> {
    await delay(200);
    return true;
  }

  async disconnect(_camera_id: string): Promise<void> {
    await delay(100);
  }

  async getStatus(_camera: Camera, _creds: Record<string, string>): Promise<CameraStatus> {
    await delay(100);
    return Math.random() > 0.1 ? "online" : "offline";
  }

  async getCapabilities(_camera: Camera, _creds: Record<string, string>): Promise<CameraCapabilities> {
    return { live: true, snapshot: true, recording: true, audio: true, ptz: true, motion_detection: true, rtsp: true };
  }

  async getSnapshot(_camera: Camera, _creds: Record<string, string>): Promise<SnapshotResult> {
    await delay(500);
    return { url: `${MOCK_SNAPSHOT}?t=${Date.now()}`, taken_at: new Date().toISOString(), width: 1280, height: 720 };
  }

  async getStreamInfo(_camera: Camera, _creds: Record<string, string>): Promise<StreamInfo> {
    await delay(200);
    return { hls_url: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` };
  }

  async healthCheck(camera: Camera, creds: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    const status = await this.getStatus(camera, creds);
    return { camera_id: camera.id, status, latency_ms: Date.now() - start, checked_at: new Date().toISOString() };
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
