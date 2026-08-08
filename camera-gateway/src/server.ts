// ─── Gateway HTTP server ───────────────────────────────────────────────────
// Jarvis Cloud'dagi RtspProvider shu endpointlarga so'rov yuboradi
// (src/lib/camera/providers/rtsp-provider.ts). Bu server odatda to'g'ridan-to'g'ri
// internetga ochilmaydi — operator Cloudflare Tunnel/Tailscale Funnel/ngrok
// orqali CAMERA_GATEWAY_URL sifatida cloud'ga ko'rsatadi.
//
// Auth: CAMERA_GATEWAY_SECRET bilan bir xil bo'lgan Bearer token talab qilinadi
// (cloud tarafda CAMERA_GATEWAY_SECRET env orqali sozlanadi).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Cam } from "onvif";
import { captureRtspSnapshot } from "./snapshot.js";

const PORT = Number(process.env.GATEWAY_PORT || 8787);
const SECRET = process.env.CAMERA_GATEWAY_SECRET || "";

type TargetBody = {
  camera_id: string;
  ip?: string;
  username?: string;
  password?: string;
  rtsp_url?: string;
};

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) as Record<string, unknown> : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function connectOnvif(ip: string, username: string, password: string): Promise<Cam> {
  return new Promise((resolve, reject) => {
    const cam = new Cam({ hostname: ip, username, password, port: 80, timeout: 8000 }, (err: Error | null) => {
      if (err) reject(err); else resolve(cam);
    });
  });
}

function getStreamUri(cam: Cam): Promise<string> {
  return new Promise((resolve, reject) => {
    cam.getStreamUri({ protocol: "RTSP" }, (err: Error | null, stream: { uri: string }) => {
      if (err) reject(err); else resolve(stream.uri);
    });
  });
}

// ONVIF getStreamUri natijasi odatda credentials'siz URL qaytaradi — RTSP
// autentifikatsiya uchun URL ichiga qo'shib beramiz (rtsp://ip/... → rtsp://user:pass@ip/...)
function injectCredentials(rtspUrl: string, username: string, password: string): string {
  try {
    const u = new URL(rtspUrl);
    u.username = encodeURIComponent(username);
    u.password = encodeURIComponent(password);
    return u.toString();
  } catch { return rtspUrl; }
}

async function resolveRtspUrl(body: TargetBody): Promise<string> {
  if (body.rtsp_url) return body.rtsp_url;
  if (!body.ip || !body.username || !body.password) {
    throw new Error("ip, username, password kerak (yoki to'g'ridan-to'g'ri rtsp_url)");
  }
  const cam = await connectOnvif(body.ip, body.username, body.password);
  const uri = await getStreamUri(cam);
  return injectCredentials(uri, body.username, body.password);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function checkAuth(req: IncomingMessage): boolean {
  if (!SECRET) return true; // dev holat — production'da CAMERA_GATEWAY_SECRET majburiy bo'lsin
  const header = req.headers.authorization || "";
  return header === `Bearer ${SECRET}`;
}

export function startGatewayServer() {
  const server = createServer((req, res) => {
    void (async () => {
      if (!checkAuth(req)) return json(res, 401, { error: "Unauthorized" });

      try {
        if (req.method === "POST" && req.url === "/snapshot") {
          const body = await readBody(req) as TargetBody;
          const rtspUrl = await resolveRtspUrl(body);
          const buf = await captureRtspSnapshot(rtspUrl);
          const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
          return json(res, 200, { url: dataUrl });
        }

        if (req.method === "POST" && req.url === "/stream/status") {
          const body = await readBody(req) as TargetBody;
          try {
            if (body.ip && body.username && body.password) await connectOnvif(body.ip, body.username, body.password);
            return json(res, 200, { status: "online" });
          } catch {
            return json(res, 200, { status: "offline" });
          }
        }

        if (req.method === "POST" && req.url === "/stream/start") {
          // HLS transkodlash (RTSP → HLS) hali yozilmagan — soxta URL qaytarish
          // o'rniga aniq xato beramiz (Jarvis buni "stream olib bo'lmadi" deb ko'rsatadi).
          return json(res, 501, { error: "Live HLS stream hali amalga oshirilmagan (gateway/README.md'ga qarang)" });
        }

        if (req.method === "POST" && req.url === "/stream/stop") {
          return json(res, 200, { ok: true });
        }

        json(res, 404, { error: "Not found" });
      } catch (e) {
        json(res, 502, { error: e instanceof Error ? e.message : "Gateway xatosi" });
      }
    })();
  });

  server.listen(PORT, () => {
    console.log(`[gateway] HTTP server ${PORT}-portda ishlamoqda`);
    if (!SECRET) console.warn("[gateway] OGOHLANTIRISH: CAMERA_GATEWAY_SECRET sozlanmagan — auth o'chirilgan (faqat dev uchun)");
  });

  return server;
}
