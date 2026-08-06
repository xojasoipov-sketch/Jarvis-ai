import { NextRequest, NextResponse } from "next/server";
import { listGoals, createGoal } from "@/lib/finance-store";

export async function GET() {
  const items = await listGoals();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { title, target_amount, deadline } = await req.json();
  if (!title || !target_amount) return NextResponse.json({ error: "title va target_amount kerak" }, { status: 400 });
  const item = await createGoal({ title, target_amount: Number(target_amount), deadline });
  return NextResponse.json({ item });
}
