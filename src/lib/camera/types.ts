// ─── Camera AI Module — umumiy tiplar ────────────────────────────────────────

export type CameraProvider = "ezviz" | "rtsp" | "onvif" | "mock";

export type CameraStatus = "online" | "offline" | "error" | "unknown";

export type CameraCapabilities = {
  live: boolean;
  snapshot: boolean;
  recording: boolean;
  audio: boolean;
  ptz: boolean;
  motion_detection: boolean;
  rtsp: boolean;
};

export type Camera = {
  id: string;
  name: string;
  provider: CameraProvider;
  location: string;
  serial: string;
  rtsp_url: string;
  status: CameraStatus;
  last_seen: string | null;
  capabilities: CameraCapabilities;
  metadata: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
};

export type CameraZone = {
  id: string;
  camera_id: string;
  name: string;
  zone_type: "normal" | "restricted" | "entry" | "exit";
  polygon: [number, number][];
  enabled: boolean;
};

export type DetectedObject = {
  type: "person" | "vehicle" | "car" | "truck" | "motorcycle" | "bicycle" | "animal" | "package" | "unknown";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
};

export type EventType =
  | "motion_detected"
  | "person_detected"
  | "vehicle_detected"
  | "animal_detected"
  | "package_detected"
  | "unknown_object"
  | "zone_enter"
  | "zone_exit"
  | "restricted_zone"
  | "camera_offline"
  | "camera_online"
  | "stream_error"
  | "recording_started"
  | "recording_finished"
  | "suspicious_activity"
  | "custom_rule_triggered";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export type CameraEvent = {
  id: string;
  camera_id: string;
  zone_id: string | null;
  event_type: EventType;
  severity: EventSeverity;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  track_id: string | null;
  snapshot_url: string | null;
  ai_summary: string | null;
  objects: DetectedObject[];
  metadata: Record<string, unknown>;
  notified: boolean;
};

export type CameraRule = {
  id: string;
  camera_id: string | null;
  name: string;
  trigger_type: "object_detected" | "zone_enter" | "zone_exit" | "schedule" | "camera_offline";
  trigger_config: Record<string, unknown>;
  action_type: "telegram_alert" | "record" | "snapshot" | "webhook";
  action_config: Record<string, unknown>;
  schedule: { start: string; end: string; days?: string[] } | null;
  enabled: boolean;
};

export type SnapshotResult = {
  url: string;
  taken_at: string;
  width?: number;
  height?: number;
};

export type StreamInfo = {
  hls_url?: string;
  rtsp_url?: string;
  webrtc_url?: string;
  expires_at?: string;
};

export type HealthCheckResult = {
  camera_id: string;
  status: CameraStatus;
  latency_ms: number | null;
  error?: string;
  checked_at: string;
};

export type PtzDirection = "left" | "right" | "up" | "down" | "up_left" | "up_right" | "down_left" | "down_right";

// ─── Provider Interface ───────────────────────────────────────────────────────
export interface ICameraProvider {
  readonly name: string;
  connect(camera: Camera, credentials: Record<string, string>): Promise<boolean>;
  disconnect(camera_id: string): Promise<void>;
  getStatus(camera: Camera, credentials: Record<string, string>): Promise<CameraStatus>;
  getCapabilities(camera: Camera, credentials: Record<string, string>): Promise<CameraCapabilities>;
  getSnapshot(camera: Camera, credentials: Record<string, string>): Promise<SnapshotResult | null>;
  getStreamInfo(camera: Camera, credentials: Record<string, string>): Promise<StreamInfo | null>;
  healthCheck(camera: Camera, credentials: Record<string, string>): Promise<HealthCheckResult>;

  // PTZ — faqat camera.capabilities.ptz=true bo'lganda chaqiriladi (37-band:
  // "faqat capability mavjud bo'lsa expose qil"). Provider ptz qo'llamasa
  // bu metodlarni implement qilmasligi mumkin — chaqiruvchi tomon avval
  // getCapabilities().ptz'ni tekshiradi.
  ptzMove?(camera: Camera, credentials: Record<string, string>, direction: PtzDirection, speed?: number): Promise<void>;
  ptzStop?(camera: Camera, credentials: Record<string, string>): Promise<void>;
  ptzHome?(camera: Camera, credentials: Record<string, string>): Promise<void>;
  ptzPreset?(camera: Camera, credentials: Record<string, string>, preset: string): Promise<void>;
}
