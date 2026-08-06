import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, addSubscription, cancelSubscription } from "@/lib/finance-store";

export async function GET() {
  const items = await listSubscriptions();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { name, amount, cycle, next_charge } = await req.json();
  if (!name || !amount || !next_charge) return NextResponse.json({ error: "name, amount, next_charge kerak" }, { status: 400 });
  const item = await addSubscription({ name, amount: Number(amount), cycle: cycle || "monthly", next_charge });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await cancelSubscription(id);
  return NextResponse.json({ ok: true });
}
