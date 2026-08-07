/**
 * POST /api/automation/tick
 * Called every minute by Vercel Cron or Railway cron job.
 * Finds all active scheduled flows whose cron matches "now" and runs them.
 *
 * Protect with CRON_SECRET env var — Vercel sends it automatically via
 * Authorization: Bearer <CRON_SECRET> header when using vercel.json crons.
 */
import { NextRequest, NextResponse } from "next/server";
import { listFlows } from "@/lib/automation-store";
import { runFlow } from "@/lib/flow-runner";
import { matchesCron } from "@/lib/cron";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  // Verify secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const flows = await listFlows();

  const due = flows.filter(
    (f) =>
      f.active &&
      f.trigger_type === "schedule" &&
      typeof f.trigger_config.cron === "string" &&
      matchesCron(f.trigger_config.cron, now)
  );

  log("info", "cron", `Tick ${now.toISOString()} — ${due.length} flow(s) due`);

  if (due.length === 0) {
    return NextResponse.json({ ok: true, ran: 0, ts: now.toISOString() });
  }

  // Fire all due flows in parallel (non-blocking — catch errors individually)
  const results = await Promise.allSettled(
    due.map((flow) =>
      runFlow(flow, "schedule", "").catch((e) => {
        log("error", "cron", `Flow "${flow.name}" xatosi: ${e.message}`);
        return { ok: false, error: e.message };
      })
    )
  );

  const summary = due.map((flow, i) => ({
    id: flow.id,
    name: flow.name,
    ok: results[i].status === "fulfilled",
  }));

  log("info", "cron", `Tick natija: ${JSON.stringify(summary)}`);

  return NextResponse.json({ ok: true, ran: due.length, ts: now.toISOString(), flows: summary });
}

// GET for easy health check / manual trigger from browser
export async function GET(req: NextRequest) {
  return POST(req);
}
