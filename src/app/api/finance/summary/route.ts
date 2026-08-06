import { NextResponse } from "next/server";
import { financeSummary } from "@/lib/finance-store";

export async function GET() {
  const summary = await financeSummary();
  return NextResponse.json(summary);
}
