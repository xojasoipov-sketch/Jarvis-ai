// ─── Camera Service — asosiy business logic ───────────────────────────────────
import { getProvider } from "./providers";
import {
  listCameras, getCamera, getCameraCredentials, updateCamera,
  createEvent, listEvents, searchEvents, listZones, logHealth, saveSnapshot,
} from "./camera-store";
import { analyzeSnapshot, classifyEventSeverity } from "./vision/detector";
import type { Camera, CameraEvent, EventType, SnapshotResult, StreamInfo } from "./types";

// ─── Rate limiting / cache ─────────────────────────────────────────────────────
// UI 15s intervalda status so'raydi — har renderda EZVIZ'ga request yubormaslik
// uchun qisqa TTL kesh. Live stream/snapshot kabi "haqiqiy vaqt" kerak bo'lgan
// so'rovlar kesh qilinmaydi.
const STATUS_CACHE_TTL_MS = 10_000;
const statusCache = new Map<string, { status: Camera["status"]; at: number }>();

// ─── Camera list + status ─────────────────────────────────────────────────────
export async function getCameraList() {
  return listCameras();
}

export async function getCameraStatus(camera_id: string, opts: { force?: boolean } = {}) {
  const cam = await getCamera(camera_id);
  if (!cam) throw new Error(`Kamera topilmadi: ${camera_id}`);

  if (!opts.force) {
    const cached = statusCache.get(camera_id);
    if (cached && Date.now() - cached.at < STATUS_CACHE_TTL_MS) {
      return { camera: { ...cam, status: cached.status }, status: cached.status };
    }
  }

  const creds = await getCameraCredentials(camera_id);
  const provider = getProvider(cam.provider);
  const status = await provider.getStatus(cam, creds);
  statusCache.set(camera_id, { status, at: Date.now() });
  await updateCamera(camera_id, { status, last_seen: status === "online" ? new Date().toISOString() : cam.last_seen });
  return { camera: cam, status };
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────
export async function takeSnapshot(camera_id: string): Promise<SnapshotResult & { camera: Camera }> {
  const cam = await getCamera(camera_id);
  if (!cam) throw new Error(`Kamera topilmadi: ${camera_id}`);
  const creds = await getCameraCredentials(camera_id);
  const provider = getProvider(cam.provider);
  const snap = await provider.getSnapshot(cam, creds);
  if (!snap) throw new Error(`${cam.name} kamerasidan snapshot olib bo'lmadi`);
  await saveSnapshot({ camera_id, url: snap.url, width: snap.width, height: snap.height });
  return { ...snap, camera: cam };
}

// ─── Stream ───────────────────────────────────────────────────────────────────
export async function getStreamInfo(camera_id: string): Promise<StreamInfo & { camera: Camera }> {
  const cam = await getCamera(camera_id);
  if (!cam) throw new Error(`Kamera topilmadi: ${camera_id}`);
  const creds = await getCameraCredentials(camera_id);
  const provider = getProvider(cam.provider);
  const stream = await provider.getStreamInfo(cam, creds);
  if (!stream) throw new Error(`${cam.name} kamerasi stream bermayapti`);
  return { ...stream, camera: cam };
}

// ─── AI Vision Analysis ───────────────────────────────────────────────────────
export async function analyzeCamera(camera_id: string): Promise<{
  camera: Camera;
  snapshot: SnapshotResult;
  analysis: Awaited<ReturnType<typeof analyzeSnapshot>>;
  event?: CameraEvent;
}> {
  const cam = await getCamera(camera_id);
  if (!cam) throw new Error(`Kamera topilmadi: ${camera_id}`);
  const creds = await getCameraCredentials(camera_id);
  const provider = getProvider(cam.provider);
  const snap = await provider.getSnapshot(cam, creds);
  if (!snap) throw new Error(`${cam.name}: snapshot olib bo'lmadi`);

  await saveSnapshot({ camera_id, url: snap.url });
  const analysis = await analyzeSnapshot(snap.url, `Kamera: ${cam.name}, Joylashuv: ${cam.location}`);

  let event: CameraEvent | undefined;
  if (analysis.interesting && analysis.objects.length > 0) {
    const primaryObj = analysis.objects[0];
    const severity = classifyEventSeverity(`${primaryObj.type}_detected`, analysis.objects);
    event = await createEvent({
      camera_id,
      zone_id: null,
      event_type: `${primaryObj.type}_detected` as EventType,
      severity,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_sec: 0,
      track_id: null,
      snapshot_url: snap.url,
      ai_summary: analysis.summary,
      objects: analysis.objects,
      metadata: { scene: analysis.scene },
    });
  }

  return { camera: cam, snapshot: snap, analysis, event };
}

// ─── Health Check ─────────────────────────────────────────────────────────────
export async function healthCheckAll(): Promise<{ camera: Camera; status: string; latency_ms: number | null }[]> {
  const cameras = await listCameras();
  return Promise.all(cameras.map(async (cam) => {
    const creds = await getCameraCredentials(cam.id);
    const provider = getProvider(cam.provider);
    const result = await provider.healthCheck(cam, creds);
    await logHealth(cam.id, result.status, result.latency_ms ?? null, result.error);
    await updateCamera(cam.id, { status: result.status as Camera["status"], last_seen: result.checked_at });
    return { camera: cam, status: result.status, latency_ms: result.latency_ms ?? null };
  }));
}

// ─── Events ───────────────────────────────────────────────────────────────────
export { listEvents, searchEvents, listZones };
