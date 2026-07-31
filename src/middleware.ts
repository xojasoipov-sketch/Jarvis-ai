import { NextRequest, NextResponse } from "next/server";
import { authConfigured, verifySessionToken } from "@/lib/auth";

// Simple in-memory rate limiter — 60 requests per minute per IP for /api/chat
const ratemap = new Map<string, { count: number; reset: number }>();
const LIMIT = 60;
const WINDOW = 60_000;

function rateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const entry = ratemap.get(ip);

  if (!entry || now > entry.reset) {
    ratemap.set(ip, { count: 1, reset: now + WINDOW });
    return null;
  }
  if (entry.count >= LIMIT) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }
  entry.count++;
  return null;
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/chat")) {
    const limited = rateLimit(req);
    if (limited) return limited;
  }

  // Password gate — only active when APP_PASSWORD is set, so it's opt-in and
  // never locks anyone out who hasn't configured it yet.
  if (authConfigured) {
    const session = req.cookies.get("pari_session")?.value;
    if (!(await verifySessionToken(session))) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|login|api/auth/login|api/telegram).*)",
  ],
};
