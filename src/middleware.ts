import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter — 60 requests per minute per IP for /api/chat
const ratemap = new Map<string, { count: number; reset: number }>();
const LIMIT = 60;
const WINDOW = 60_000;

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/chat")) return NextResponse.next();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const entry = ratemap.get(ip);

  if (!entry || now > entry.reset) {
    ratemap.set(ip, { count: 1, reset: now + WINDOW });
    return NextResponse.next();
  }

  if (entry.count >= LIMIT) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  entry.count++;
  return NextResponse.next();
}

export const config = { matcher: "/api/chat" };
