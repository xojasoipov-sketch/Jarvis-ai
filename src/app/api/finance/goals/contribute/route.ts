import { NextRequest, NextResponse } from "next/server";
import { contributeToGoal } from "@/lib/finance-store";

export async function POST(req: NextRequest) {
  const { id, amount } = await req.json();
  if (!id || !amount) return NextResponse.json({ error: "id va amount kerak" }, { status: 400 });
  const item = await contributeToGoal(id, Number(amount));
  return NextResponse.json({ item });
}
