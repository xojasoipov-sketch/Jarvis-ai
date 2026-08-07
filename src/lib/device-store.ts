// Qurilma registri — pairing, heartbeat, buyruqlar. Supabase + in-memory fallback.
import { supabase, dbConfigured } from "./supabase";
import { log } from "./logger";

export type Platform = "android" | "ios" | "windows" | "macos" | "linux";

export type Device = {
  id: string;
  name: string;
  platform: Platform;
  os_info: string;
  status: "online" | "offline";
  battery: number | null;
  storage_free: number | null;
  cpu_load: number | null;
  ram_used: number | null;
  location: string | null;
  last_seen: string | null;
  paired_at: string;
  revoked: boolean;
  device_token_hash: string | null;
};

export type DeviceCommand = {
  id: string;
  device_id: string;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "done" | "error";
  result: unknown;
  created_at: string;
};

type Pairing = { device_id: string; expires_at: string; used: boolean };

const memDevices = new Map<string, Device>();
const memPairings = new Map<string, Pairing>();
const memCommands: DeviceCommand[] = [];

function uid() {
  return crypto.randomUUID();
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── Pairing lifecycle ── */
export async function createPendingDevice(): Promise<string> {
  const id = uid();
  const device: Device = {
    id, name: "Yangi qurilma", platform: "android", os_info: "",
    status: "offline", battery: null, storage_free: null, cpu_load: null, ram_used: null,
    location: null, last_seen: null, paired_at: new Date().toISOString(), revoked: false, device_token_hash: null,
  };
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_devices").insert(device);
    if (error) log("error", "devices", `createPendingDevice: ${error.message}`);
  } else {
    memDevices.set(id, device);
  }
  return id;
}

export async function savePairing(deviceId: string, expiresAt: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_device_pairings").upsert({ device_id: deviceId, expires_at: expiresAt, used: false });
    if (error) log("error", "devices", `savePairing: ${error.message}`);
    return;
  }
  memPairings.set(deviceId, { device_id: deviceId, expires_at: expiresAt, used: false });
}

export async function consumePairing(deviceId: string): Promise<boolean> {
  if (dbConfigured && supabase) {
    const { data, error: getErr } = await supabase.from("pari_device_pairings").select("*").eq("device_id", deviceId).single();
    if (getErr) log("error", "devices", `consumePairing (read): ${getErr.message}`);
    if (!data || data.used || new Date(data.expires_at).getTime() < Date.now()) return false;
    const { error } = await supabase.from("pari_device_pairings").update({ used: true }).eq("device_id", deviceId);
    if (error) log("error", "devices", `consumePairing (write): ${error.message}`);
    return true;
  }
  const p = memPairings.get(deviceId);
  if (!p || p.used || new Date(p.expires_at).getTime() < Date.now()) return false;
  p.used = true;
  return true;
}

/** Pairing tasdiqlanganda: qurilma nomi/platformasini belgilaydi, device token hash saqlaydi. */
export async function confirmDevice(deviceId: string, input: { name: string; platform: Platform; os_info?: string }, deviceToken: string): Promise<Device | null> {
  const tokenHash = await sha256(deviceToken);
  const patch = {
    name: input.name, platform: input.platform, os_info: input.os_info || "",
    status: "online" as const, last_seen: new Date().toISOString(), device_token_hash: tokenHash,
  };
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_devices").update(patch).eq("id", deviceId).select().single();
    if (error) log("error", "devices", `confirmDevice: ${error.message}`);
    return data || null;
  }
  const d = memDevices.get(deviceId);
  if (!d) return null;
  Object.assign(d, patch);
  return d;
}

/** Device tokenning DB'dagi hash bilan mosligini va revoke qilinmaganini tekshiradi. */
export async function verifyDeviceSession(deviceId: string, deviceToken: string): Promise<boolean> {
  const device = await getDevice(deviceId);
  if (!device || device.revoked || !device.device_token_hash) return false;
  const hash = await sha256(deviceToken);
  return hash === device.device_token_hash;
}

/* ── Device CRUD ── */
export async function getDevice(id: string): Promise<Device | null> {
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_devices").select("*").eq("id", id).single();
    if (error) log("error", "devices", `getDevice: ${error.message}`);
    return data || null;
  }
  return memDevices.get(id) || null;
}

export async function listDevices(): Promise<Device[]> {
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_devices").select("*").not("device_token_hash", "is", null).order("paired_at", { ascending: false });
    if (error) log("error", "devices", `listDevices: ${error.message}`);
    return data || [];
  }
  return [...memDevices.values()].filter((d) => d.device_token_hash);
}

export async function heartbeat(id: string, patch: Partial<Pick<Device, "battery" | "storage_free" | "cpu_load" | "ram_used" | "location">>): Promise<void> {
  const full = { ...patch, status: "online" as const, last_seen: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_devices").update(full).eq("id", id);
    if (error) log("error", "devices", `heartbeat: ${error.message}`);
    return;
  }
  const d = memDevices.get(id);
  if (d) Object.assign(d, full);
}

/** 60 soniyadan beri signal bermagan qurilmalarni offline belgilaydi. */
export async function markStaleOffline(): Promise<void> {
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_devices").update({ status: "offline" }).eq("status", "online").lt("last_seen", cutoff);
    if (error) log("error", "devices", `markStaleOffline: ${error.message}`);
    return;
  }
  for (const d of memDevices.values()) {
    if (d.status === "online" && d.last_seen && d.last_seen < cutoff) d.status = "offline";
  }
}

export async function revokeDevice(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_devices").update({ revoked: true, status: "offline" }).eq("id", id);
    if (error) log("error", "devices", `revokeDevice: ${error.message}`);
    return;
  }
  const d = memDevices.get(id);
  if (d) { d.revoked = true; d.status = "offline"; }
}

export async function removeDevice(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_devices").delete().eq("id", id);
    if (error) log("error", "devices", `removeDevice: ${error.message}`);
    return;
  }
  memDevices.delete(id);
}

/* ── Commands ── */
export async function queueCommand(deviceId: string, action: string, payload: Record<string, unknown>): Promise<DeviceCommand> {
  const cmd: DeviceCommand = { id: uid(), device_id: deviceId, action, payload, status: "pending", result: null, created_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_device_commands").insert(cmd).select().single();
    if (error) log("error", "devices", `queueCommand: ${error.message}`);
    return data || cmd;
  }
  memCommands.push(cmd);
  return cmd;
}

export async function pollCommands(deviceId: string): Promise<DeviceCommand[]> {
  if (dbConfigured && supabase) {
    // 1) "delivered" holatida 60 soniyadan ko'proq qolgan buyruqlarni "pending"ga qaytaramiz
    //    (telefon crash bo'lsa buyruqlar yo'qolmasin)
    const stuckCutoff = new Date(Date.now() - 60_000).toISOString();
    await supabase.from("pari_device_commands")
      .update({ status: "pending" })
      .eq("device_id", deviceId)
      .eq("status", "delivered")
      .lt("created_at", stuckCutoff);

    // 2) Yangi pending buyruqlarni olamiz
    const { data, error } = await supabase.from("pari_device_commands").select("*").eq("device_id", deviceId).eq("status", "pending").order("created_at", { ascending: true });
    if (error) log("error", "devices", `pollCommands (read): ${error.message}`);
    if (data?.length) {
      const { error: updErr } = await supabase.from("pari_device_commands").update({ status: "delivered" }).in("id", data.map((c) => c.id));
      if (updErr) log("error", "devices", `pollCommands (update): ${updErr.message}`);
    }
    return data || [];
  }
  const pending = memCommands.filter((c) => c.device_id === deviceId && c.status === "pending");
  pending.forEach((c) => { c.status = "delivered"; });
  return pending;
}

export async function submitResult(cmdId: string, result: unknown, status: "done" | "error" = "done"): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_device_commands").update({ status, result }).eq("id", cmdId);
    if (error) log("error", "devices", `submitResult: ${error.message}`);
    return;
  }
  const c = memCommands.find((x) => x.id === cmdId);
  if (c) { c.status = status; c.result = result; }
}

export async function listCommandHistory(deviceId: string, limit = 30): Promise<DeviceCommand[]> {
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_device_commands").select("*").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(limit);
    if (error) log("error", "devices", `listCommandHistory: ${error.message}`);
    return data || [];
  }
  return memCommands.filter((c) => c.device_id === deviceId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}
