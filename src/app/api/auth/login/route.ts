import { NextRequest, NextResponse } from "next/server";
import { authConfigured, checkPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: "APP_PASSWORD sozlanmagan" }, { status: 503 });
  const { password } = await req.json();
  if (!password || !checkPassword(String(password))) {
    return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pari_session", await createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pari_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
