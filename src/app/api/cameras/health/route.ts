import { NextResponse } from "next/server";
import { healthCheckAll } from "@/lib/camera/camera-service";

export async function GET() {
  const results = await healthCheckAll();
  const online = results.filter(r => r.status === "online").length;
  return NextResponse.json({ results, online, offline: results.length - online, total: results.length });
}
