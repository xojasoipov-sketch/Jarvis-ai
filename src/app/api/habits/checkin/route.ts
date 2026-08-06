import { NextRequest, NextResponse } from "next/server";
import { checkinHabit } from "@/lib/habits-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { habit_id, date, done = true } = body;
  if (!habit_id) return NextResponse.json({ error: "habit_id kerak" }, { status: 400 });
  const checkin = await checkinHabit(habit_id, date, done);
  return NextResponse.json({ checkin });
}
