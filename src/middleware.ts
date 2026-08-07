import { NextRequest, NextResponse } from "next/server";
import { authConfigured, verifySessionToken } from "@/lib/auth";

// Sliding window rate limiter — in-memory (per Edge invocation)
// For production, replace with Upstash Redis (same API, durable across invocations)
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

// Clean up stale entries every ~100 requests (cheap enough for edge)
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

  // Per-route rate limits
  if (path.startsWith("/api/chat")) {
    const limited = rateLimit(req, 60, 60_000); // 60 req/min
    if (limited) return limited;
  }
  if (path.startsWith("/api/agent")) {
    const limited = rateLimit(req, 30, 60_000); // 30 req/min (agent calls are heavier)
    if (limited) return limited;
  }
  if (path.startsWith("/api/hermes")) {
    const limited = rateLimit(req, 20, 60_000); // 20 req/min
    if (limited) return limited;
  }
  if (path.startsWith("/api/tts") || path.startsWith("/api/stt") || path.startsWith("/api/voice")) {
    const limited = rateLimit(req, 10, 60_000); // 10 req/min (ElevenLabs quota)
    if (limited) return limited;
  }

  // Password gate — opt-in via APP_PASSWORD env var
  if (authConfigured) {
    const session = req.cookies.get("pari_session")?.value;
    if (!(await verifySessionToken(session))) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // api/devices/* — o'z Bearer-token autentifikatsiyasini o'zi qiladi (device_token yoki
  // auto-pair kaliti), veb-ilova sessiya cookie'siga bog'liq emas — shuning uchun global
  // parol-gate'dan chetlashtirilgan (aks holda telefon/kompyuter ilovasi hech qachon
  // ulana olmaydi, chunki unda brauzer sessiyasi yo'q).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|login|api/auth/login|api/telegram|api/devices|monitoring|setup|portfolio).*)",
  ],
};
