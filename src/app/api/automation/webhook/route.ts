/**
 * POST /api/automation/webhook?secret=xxx
 * External services trigger flows via this endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { listFlows } from "@/lib/automation-store";
import { runFlow } from "@/lib/flow-runner";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret) return NextResponse.json({ error: "secret kerak" }, { status: 400 });

  // Find flow with matching webhook secret
  const flows = await listFlows();
  const flow = flows.find(
    (f) => f.trigger_type === "webhook" && f.trigger_config.secret === secret && f.active
  );

  if (!flow) {
    log("warn", "automation", `Webhook: noto'g'ri secret yoki flow faol emas`);
    return NextResponse.json({ error: "Flow topilmadi" }, { status: 404 });
  }

  const body = await req.text().catch(() => "");
  log("info", "automation", `Webhook trigger: flow "${flow.name}"`);

  // Run async — respond immediately
  runFlow(flow, "webhook", body).catch((e) =>
    log("error", "automation", `Webhook flow xatosi: ${e.message}`)
  );

  return NextResponse.json({ ok: true, flow_id: flow.id, flow_name: flow.name });
}

export async function GET(req: NextRequest) {
  // Health check / verify endpoint for services that send GET to confirm webhook
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret) return NextResponse.json({ ok: true, info: "Pari AI Automation Webhook" });
  return NextResponse.json({ ok: true, challenge: req.nextUrl.searchParams.get("hub.challenge") });
}
