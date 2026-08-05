/**
 * /api/computer — Local computer control via bridge polling
 *
 * Architecture:
 *   Pari AI (cloud) ←→ /api/computer ←→ pari-bridge.py (runs on user's PC)
 *
 * GET  /api/computer?device_id=...          — bridge polls for pending commands
 * POST /api/computer                        — AI queues a command
 * POST /api/computer?action=result          — bridge posts command result
 * POST /api/computer?action=heartbeat       — bridge heartbeat + screenshot
 * GET  /api/computer?action=screenshot&device_id=... — get latest screenshot
 * GET  /api/computer?action=devices         — list connected computers
 */
import { NextRequest, NextResponse } from "next/server";

export interface ComputerDevice {
  id: string;
  name: string;
  os: string;
  username: string;
  status: "online" | "offline";
  last_seen: string;
  registered_at: string;
  screenshot_b64?: string;   // latest screenshot (base64 jpeg)
  screenshot_at?: string;
  resolution?: string;
}

export interface ComputerCommand {
  id: string;
  device_id: string;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  result?: unknown;
  queued_at: string;
  done_at?: string;
}

// ── In-memory store ──────────────────────────────────────────────────────────
const computers = new Map<string, ComputerDevice>();
const commandQueues = new Map<string, ComputerCommand[]>(); // device_id → commands

function getQueue(deviceId: string): ComputerCommand[] {
  if (!commandQueues.has(deviceId)) commandQueues.set(deviceId, []);
  return commandQueues.get(deviceId)!;
}

function markOfflineStale(): void {
  const stale = Date.now() - 15_000; // 15s no heartbeat → offline
  for (const dev of computers.values()) {
    if (dev.status === "online" && new Date(dev.last_seen).getTime() < stale) {
      dev.status = "offline";
    }
  }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action");
  const deviceId = sp.get("device_id");

  markOfflineStale();

  // List all computers
  if (action === "devices" || (!action && !deviceId)) {
    const list = Array.from(computers.values()).map(d => ({ ...d, screenshot_b64: undefined }));
    return NextResponse.json({ computers: list, count: list.length });
  }

  // Get latest screenshot for a device
  if (action === "screenshot" && deviceId) {
    const dev = computers.get(deviceId);
    if (!dev?.screenshot_b64) return NextResponse.json({ error: "Screenshot yo'q" }, { status: 404 });
    return NextResponse.json({ b64: dev.screenshot_b64, at: dev.screenshot_at, resolution: dev.resolution });
  }

  // Bridge polls for pending commands
  if (deviceId) {
    const dev = computers.get(deviceId);
    if (!dev) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // Update last_seen
    dev.status = "online";
    dev.last_seen = new Date().toISOString();

    const queue = getQueue(deviceId);
    const pending = queue.filter(c => c.status === "pending");
    // Mark as running
    for (const cmd of pending) cmd.status = "running";
    return NextResponse.json({ commands: pending });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Bridge heartbeat (sends system info + optional screenshot)
  if (action === "heartbeat") {
    const id = String(body.device_id || "");
    if (!id) return NextResponse.json({ error: "device_id kerak" }, { status: 400 });

    const existing = computers.get(id);
    const dev: ComputerDevice = {
      id,
      name: String(body.name || existing?.name || `Computer-${id.slice(0, 6)}`),
      os: String(body.os || existing?.os || "unknown"),
      username: String(body.username || existing?.username || ""),
      status: "online",
      last_seen: new Date().toISOString(),
      registered_at: existing?.registered_at || new Date().toISOString(),
      resolution: body.resolution ? String(body.resolution) : existing?.resolution,
    };
    if (body.screenshot_b64) {
      dev.screenshot_b64 = String(body.screenshot_b64);
      dev.screenshot_at = new Date().toISOString();
    } else {
      dev.screenshot_b64 = existing?.screenshot_b64;
      dev.screenshot_at = existing?.screenshot_at;
    }
    computers.set(id, dev);
    return NextResponse.json({ ok: true, device_id: id });
  }

  // Bridge posts command result
  if (action === "result") {
    const cmdId = String(body.command_id || "");
    const deviceId = String(body.device_id || "");
    const queue = getQueue(deviceId);
    const cmd = queue.find(c => c.id === cmdId);
    if (!cmd) return NextResponse.json({ error: "Command not found" }, { status: 404 });
    cmd.status = body.error ? "error" : "done";
    cmd.result = body.result ?? body.error;
    cmd.done_at = new Date().toISOString();
    // Also store screenshot if included
    if (body.screenshot_b64 && computers.has(deviceId)) {
      const dev = computers.get(deviceId)!;
      dev.screenshot_b64 = String(body.screenshot_b64);
      dev.screenshot_at = new Date().toISOString();
      if (body.resolution) dev.resolution = String(body.resolution);
    }
    return NextResponse.json({ ok: true });
  }

  // AI queues a command
  const deviceId = String(body.device_id || "");
  if (!deviceId) return NextResponse.json({ error: "device_id kerak" }, { status: 400 });
  if (!computers.has(deviceId)) return NextResponse.json({ error: "Computer not found" }, { status: 404 });

  const cmd: ComputerCommand = {
    id: crypto.randomUUID(),
    device_id: deviceId,
    action: String(body.action || ""),
    payload: (body.payload as Record<string, unknown>) || {},
    status: "pending",
    queued_at: new Date().toISOString(),
  };

  getQueue(deviceId).push(cmd);
  // Keep queue size bounded
  const queue = getQueue(deviceId);
  if (queue.length > 200) queue.splice(0, queue.length - 200);

  // Wait up to 8s for result (long-poll style)
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 400));
    if (cmd.status === "done" || cmd.status === "error") {
      return NextResponse.json({ ok: cmd.status === "done", command_id: cmd.id, result: cmd.result });
    }
  }

  return NextResponse.json({ ok: true, command_id: cmd.id, status: "pending", note: "Bridge javob bermadi (offline?)" });
}
