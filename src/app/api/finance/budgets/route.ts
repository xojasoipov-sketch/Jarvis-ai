import { NextRequest, NextResponse } from "next/server";
import { budgetStatus, setBudget } from "@/lib/finance-store";

export async function GET() {
  const items = await budgetStatus();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { category, monthly_limit } = await req.json();
  if (!category || monthly_limit == null) return NextResponse.json({ error: "category va monthly_limit kerak" }, { status: 400 });
  const item = await setBudget(category, Number(monthly_limit));
  return NextResponse.json({ item });
}
