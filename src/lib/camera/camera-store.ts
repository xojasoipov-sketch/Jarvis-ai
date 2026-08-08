// ─── Camera Store — Supabase CRUD ─────────────────────────────────────────────
import { supabase, dbConfigured } from "@/lib/supabase";
import type { Camera, CameraEvent, CameraRule, CameraZone, EventType } from "./types";

type CameraCredentials = Record<string, string>;

// ─── Cameras ──────────────────────────────────────────────────────────────────
export async function listCameras(): Promise<Camera[]> {
  if (!dbConfigured || !supabase) return [];
  const { data } = await supabase.from("cameras").select("*").eq("enabled", true).order("created_at");
  return (data || []) as unknown as Camera[];
}

export async function getCamera(id: string): Promise<Camera | null> {
  if (!dbConfigured || !supabase) return null;
  const { data } = await supabase.from("cameras").select("*").eq("id", id).single();
  return data as unknown as Camera | null;
}

export async function createCamera(cam: Omit<Camera, "id" | "created_at" | "status" | "last_seen">): Promise<Camera> {
  if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
  const { data, error } = await supabase.from("cameras").insert({
    ...cam, status: "unknown", last_seen: null,
  }).select().single();
  if (error) throw error;
  return data as unknown as Camera;
}

export async function updateCamera(id: string, updates: Partial<Camera>): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("cameras").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteCamera(id: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("cameras").delete().eq("id", id);
}

// ─── Credentials (plain text saqlanadi — production'da vault kerak) ───────────
export async function getCameraCredentials(camera_id: string): Promise<CameraCredentials> {
  if (!dbConfigured || !supabase) return {};
  const { data } = await supabase.from("camera_credentials").select("secret_json").eq("camera_id", camera_id).single();
  if (!data) return {};
  try { return JSON.parse(data.secret_json as string) as CameraCredentials; }
  catch { return {}; }
}

export async function setCameraCredentials(camera_id: string, creds: CameraCredentials): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_credentials").upsert({
    camera_id, secret_json: JSON.stringify(creds), updated_at: new Date().toISOString(),
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function createEvent(evt: Omit<CameraEvent, "id" | "created_at" | "notified">): Promise<CameraEvent> {
  if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
  const { data, error } = await supabase.from("camera_events").insert({ ...evt, notified: false }).select().single();
  if (error) throw error;
  return data as unknown as CameraEvent;
}

export async function listEvents(camera_id?: string, limit = 50, event_type?: EventType): Promise<CameraEvent[]> {
  if (!dbConfigured || !supabase) return [];
  let q = supabase.from("camera_events").select("*").order("started_at", { ascending: false }).limit(limit);
  if (camera_id) q = q.eq("camera_id", camera_id);
  if (event_type) q = q.eq("event_type", event_type);
  const { data } = await q;
  return (data || []) as unknown as CameraEvent[];
}

export async function searchEvents(opts: {
  camera_id?: string;
  event_type?: EventType;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<CameraEvent[]> {
  if (!dbConfigured || !supabase) return [];
  let q = supabase.from("camera_events").select("*").order("started_at", { ascending: false }).limit(opts.limit || 50);
  if (opts.camera_id) q = q.eq("camera_id", opts.camera_id);
  if (opts.event_type) q = q.eq("event_type", opts.event_type);
  if (opts.from) q = q.gte("started_at", opts.from);
  if (opts.to) q = q.lte("started_at", opts.to);
  const { data } = await q;
  return (data || []) as unknown as CameraEvent[];
}

export async function markEventNotified(id: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_events").update({ notified: true }).eq("id", id);
}

// ─── Zones ────────────────────────────────────────────────────────────────────
export async function listZones(camera_id: string): Promise<CameraZone[]> {
  if (!dbConfigured || !supabase) return [];
  const { data } = await supabase.from("camera_zones").select("*").eq("camera_id", camera_id);
  return (data || []) as unknown as CameraZone[];
}

export async function createZone(zone: Omit<CameraZone, "id">): Promise<CameraZone> {
  if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
  const { data, error } = await supabase.from("camera_zones").insert(zone).select().single();
  if (error) throw error;
  return data as unknown as CameraZone;
}

export async function updateZone(id: string, updates: Partial<CameraZone>): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_zones").update(updates).eq("id", id);
}

export async function deleteZone(id: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_zones").delete().eq("id", id);
}

// ─── Rules ────────────────────────────────────────────────────────────────────
export async function listRules(camera_id?: string): Promise<CameraRule[]> {
  if (!dbConfigured || !supabase) return [];
  let q = supabase.from("camera_rules").select("*").order("created_at");
  if (camera_id) q = q.eq("camera_id", camera_id);
  const { data } = await q;
  return (data || []) as unknown as CameraRule[];
}

export async function createRule(rule: Omit<CameraRule, "id">): Promise<CameraRule> {
  if (!dbConfigured || !supabase) throw new Error("Supabase sozlanmagan");
  const { data, error } = await supabase.from("camera_rules").insert(rule).select().single();
  if (error) throw error;
  return data as unknown as CameraRule;
}

export async function updateRule(id: string, updates: Partial<CameraRule>): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_rules").update(updates).eq("id", id);
}

export async function deleteRule(id: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_rules").delete().eq("id", id);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────
export async function saveSnapshot(snap: { camera_id: string; url: string; event_id?: string; width?: number; height?: number }): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_snapshots").insert({ ...snap, taken_at: new Date().toISOString() });
}

export async function listSnapshots(camera_id: string, limit = 20) {
  if (!dbConfigured || !supabase) return [];
  const { data } = await supabase.from("camera_snapshots").select("*").eq("camera_id", camera_id).order("taken_at", { ascending: false }).limit(limit);
  return data || [];
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function logHealth(camera_id: string, status: string, latency_ms: number | null, error?: string): Promise<void> {
  if (!dbConfigured || !supabase) return;
  await supabase.from("camera_health_logs").insert({ camera_id, status, latency_ms, error, checked_at: new Date().toISOString() });
}
