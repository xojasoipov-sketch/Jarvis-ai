import { NextResponse } from "next/server";
import { getOrderStats } from "@/lib/services-store";

export async function GET() {
  const stats = await getOrderStats();
  return NextResponse.json({ stats });
}
