import { NextRequest, NextResponse } from "next/server";
import { getStats, listChannels } from "@/lib/smm-store";

export async function GET(req: NextRequest) {
  const channelId = new URL(req.url).searchParams.get("channel_id") || undefined;
  const [stats, channels] = await Promise.all([getStats(channelId), listChannels()]);
  return NextResponse.json({ stats, channel_count: channels.length });
}
