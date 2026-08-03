import { NextRequest, NextResponse } from "next/server";
import { authConfigured, verifySessionToken } from "@/lib/auth";

const ratemap = new Map<string, { count: number; reset: number }>();

function rateLimit(
  req: NextRequest,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const entry = ratemap.get(key);

  if (!entry || now > entry.reset) {
    ratemap.set(key, { count: 1, reset: now + windowMs });
    return null;
  }
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry after ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  entry.count++;
  return null;
}

let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 100) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [key, entry] of ratemap) {
    if (now > entry.reset) ratemap.delete(key);
  }
}

export async function middleware(req: NextRequest) {
  maybeCleanup();
  const path = req.nextUrl.pathname;

  // Public: login, portfolio (SADIPRIME mehmonlar), static, auth, telegram webhook
  if (
    path === "/login" ||
    path === "/portfolio" ||
    path.startsWith("/portfolio/") ||
    path.startsWith("/_next") ||
    path.startsWith("/api/auth") ||
    path === "/favicon.ico" ||
    path === "/icon" ||
    path.startsWith("/logo")
  ) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/chat")) {
    const limited = rateLimit(req, 60, 60_000);
    if (limited) return limited;
  }
  if (path.startsWith("/api/agent")) {
    const limited = rateLimit(req, 30, 60_000);
    if (limited) return limited;
  }
  if (path.startsWith("/api/hermes")) {
    const limited = rateLimit(req, 20, 60_000);
    if (limited) return limited;
  }
  if (path.startsWith("/api/tts") || path.startsWith("/api/stt") || path.startsWith("/api/voice")) {
    const limited = rateLimit(req, 30, 60_000);
    if (limited) return limited;
  }

  if (authConfigured) {
    const session = req.cookies.get("pari_session")?.value;
    const ok = await verifySessionToken(session);
    if (!ok) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
      }
      if (path === "/login") return NextResponse.next();
      const loginUrl = new URL("/login", req.url);
      const nextPath = path.startsWith("/login") ? "/" : path;
      loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|login|portfolio|api/auth/login|api/telegram|monitoring|logo.png).*)",
  ],
};
