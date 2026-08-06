/**
 * /api/phones — Multi-device (phone) management
 *
 * GET  /api/phones                         — list registered devices
 * GET  /api/phones?action=poll&device_id=X — Tasker polls for pending commands
 * POST /api/phones                         — register / heartbeat device
 * POST /api/phones?action=cmd              — queue command for device
 * POST /api/phones?action=result           — device posts command result
 * DELETE /api/phones?id=...               — remove device
 */
import { NextRequest, NextResponse } from "next/server";

export interface PhoneDevice {
  id: string;
  name: string;
  platform: "android" | "ios" | "other";
  webhook_url: string;
  status: "online" | "offline" | "unknown";
  battery?: number;
  location?: string;
  last_seen?: string;
  registered_at: string;
}

export interface PhoneCommand {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "done" | "error";
  queued_at: string;
  result?: unknown;
}

// ── In-memory store ──────────────────────────────────────────────────────────
const devices = new Map<string, PhoneDevice>();
const commandQueues = new Map<string, PhoneCommand[]>();

function getQueue(deviceId: string): PhoneCommand[] {
  if (!commandQueues.has(deviceId)) commandQueues.set(deviceId, []);
  return commandQueues.get(deviceId)!;
}

function markStale() {
  const cutoff = Date.now() - 20_000;
  for (const d of devices.values()) {
    if (d.status === "online" && new Date(d.last_seen!).getTime() < cutoff) {
      d.status = "offline";
    }
  }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  markStale();
  const action = req.nextUrl.searchParams.get("action");
  const deviceId = req.nextUrl.searchParams.get("device_id");

  // Tasker polling: return pending commands, mark device online
  if (action === "poll" && deviceId) {
    const device = devices.get(deviceId);
    if (!device) return NextResponse.json({ error: "not_found" }, { status: 404 });

    device.status = "online";
    device.last_seen = new Date().toISOString();

    const queue = getQueue(deviceId);
    const pending = queue.filter(c => c.status === "pending");
    // Mark them as running so next poll doesn't re-deliver
    pending.forEach(c => { c.status = "done"; });

    return NextResponse.json({ commands: pending, count: pending.length });
  }

  // List all devices
  const list = Array.from(devices.values()).sort(
    (a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime(),
  );
  return NextResponse.json({ devices: list, count: list.length });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // ── Queue command ──
  if (action === "cmd") {
    const deviceId = String(body.device_id || "");
    const device = devices.get(deviceId);
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const cmd: PhoneCommand = {
      id: crypto.randomUUID(),
      action: String(body.action || "custom"),
      payload: (body.payload as Record<string, unknown>) || {},
      status: "pending",
      queued_at: new Date().toISOString(),
    };

    // If device has webhook_url, try push first
    if (device.webhook_url) {
      try {
        const res = await fetch(device.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId, ...cmd }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          cmd.status = "done";
          return NextResponse.json({ ok: true, delivery: "push", cmd });
        }
      } catch { /* fall through to queue */ }
    }

    // Queue for polling
    getQueue(deviceId).push(cmd);
    // Keep queue tidy — max 50 commands
    const q = getQueue(deviceId);
    if (q.length > 50) q.splice(0, q.length - 50);

    return NextResponse.json({ ok: true, delivery: "queued", cmd });
  }

  // ── Command result from device ──
  if (action === "result") {
    const deviceId = String(body.device_id || "");
    const cmdId = String(body.cmd_id || "");
    const queue = getQueue(deviceId);
    const cmd = queue.find(c => c.id === cmdId);
    if (cmd) { cmd.status = "done"; cmd.result = body.result; }
    return NextResponse.json({ ok: true });
  }

  // ── Register / heartbeat ──
  const id = String(body.id || crypto.randomUUID());
  const existing = devices.get(id);
  const device: PhoneDevice = {
    id,
    name: String(body.name || `Device ${id.slice(0, 6)}`),
    platform: (body.platform as PhoneDevice["platform"]) || "android",
    webhook_url: String(body.webhook_url || existing?.webhook_url || ""),
    status: "online",
    battery: typeof body.battery === "number" ? body.battery : existing?.battery,
    location: body.location ? String(body.location) : existing?.location,
    last_seen: new Date().toISOString(),
    registered_at: existing?.registered_at || new Date().toISOString(),
  };
  devices.set(id, device);
  return NextResponse.json({ ok: true, device });
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const deleted = devices.delete(id);
  commandQueues.delete(id);
  return NextResponse.json({ ok: deleted });
}
