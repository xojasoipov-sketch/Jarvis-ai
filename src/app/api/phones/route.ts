/**
 * /api/phones — Multi-device (phone) management
 *
 * GET  /api/phones              — list registered devices
 * POST /api/phones              — register / update device
 * POST /api/phones?action=cmd   — send command to device
 * DELETE /api/phones?id=...     — remove device
 *
 * Device model:
 *   id, name, platform, webhook_url, status, last_seen, meta (battery, location, etc.)
 *
 * Commands are forwarded to the device's webhook_url (Tasker / HTTP Shortcuts / custom app).
 * Supported commands: call, sms, open_app, volume, screen, camera, notify, custom
 */
import { NextRequest, NextResponse } from "next/server";

// ── In-memory store (use Supabase for production) ────────────────────────────

export interface PhoneDevice {
  id: string;
  name: string;
  platform: "android" | "ios" | "other";
  webhook_url: string;          // where to POST commands
  status: "online" | "offline" | "unknown";
  battery?: number;             // 0-100
  location?: string;
  last_seen?: string;
  registered_at: string;
}

export interface PhoneCommand {
  action: string;               // call | sms | open_app | volume | screen | notify | custom
  payload: Record<string, unknown>;
}

// Ephemeral store — replace with Supabase table in production
const devices = new Map<string, PhoneDevice>();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function forwardCommand(device: PhoneDevice, cmd: PhoneCommand): Promise<{ ok: boolean; status?: number; body?: string }> {
  if (!device.webhook_url) return { ok: false, body: "No webhook_url configured" };
  try {
    const res = await fetch(device.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: device.id, ...cmd }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, body: err instanceof Error ? err.message : String(err) };
  }
}

// ── Route handlers ───────────────────────────────────────────────────────────

export async function GET() {
  const list = Array.from(devices.values()).sort(
    (a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime(),
  );
  return NextResponse.json({ devices: list, count: list.length });
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  const body = await req.json().catch(() => ({}));

  // ── Send command to device ──
  if (action === "cmd") {
    const deviceId = String(body.device_id || "");
    const device = devices.get(deviceId);
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const cmd: PhoneCommand = {
      action: String(body.action || "custom"),
      payload: (body.payload as Record<string, unknown>) || {},
    };

    const result = await forwardCommand(device, cmd);
    return NextResponse.json({ ok: result.ok, device_id: deviceId, cmd, result });
  }

  // ── Register / heartbeat device ──
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

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const deleted = devices.delete(id);
  return NextResponse.json({ ok: deleted });
}
