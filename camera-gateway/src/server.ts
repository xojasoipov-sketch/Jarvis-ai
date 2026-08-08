// ─── Gateway HTTP server ───────────────────────────────────────────────────
// Jarvis Cloud'dagi RtspProvider shu endpointlarga so'rov yuboradi
// (src/lib/camera/providers/rtsp-provider.ts). Bu server odatda to'g'ridan-to'g'ri
// internetga ochilmaydi — operator Cloudflare Tunnel/Tailscale Funnel/ngrok
// orqali CAMERA_GATEWAY_URL sifatida cloud'ga ko'rsatadi.
//
// Auth: CAMERA_GATEWAY_SECRET bilan bir xil bo'lgan Bearer token talab qilinadi
// (cloud tarafda CAMERA_GATEWAY_SECRET env orqali sozlanadi).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { Cam } from "onvif";
import { captureRtspSnapshot } from "./snapshot.js";
import { startHlsSession, stopHlsSession, getSessionDir, touchSession, isValidToken } from "./hls.js";

const PORT = Number(process.env.GATEWAY_PORT || 8787);
const SECRET = process.env.CAMERA_GATEWAY_SECRET || "";
// Cloud'ga ko'rinadigan manzil (tunnel domain) — CAMERA_GATEWAY_URL bilan
// bir xil bo'lishi kerak, HLS playlist URL'ini shu asosda quramiz.
const PUBLIC_URL = (process.env.GATEWAY_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

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

// GET /hls/<cameraId>/<file>?token=... — segmentlarni brauzer/hls.js
// to'g'ridan-to'g'ri so'raydi, shuning uchun CAMERA_GATEWAY_SECRET emas,
// shu stream uchun generatsiya qilingan bir martalik token tekshiriladi
// (secrets frontendga chiqmasligi shart qoidasi — 46-band).
function serveHlsFile(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "", `http://localhost`);
  const parts = url.pathname.split("/").filter(Boolean); // ["hls", cameraId, file]
  const cameraId = parts[1];
  const file = parts[2];
  const token = url.searchParams.get("token") || "";

  if (!cameraId || !file || !/^(index\.m3u8|seg\d+\.ts)$/.test(file)) {
    return json(res, 400, { error: "Noto'g'ri so'rov" });
  }
  if (!isValidToken(cameraId, token)) {
    return json(res, 403, { error: "Token noto'g'ri yoki muddati tugagan" });
  }

  const dir = getSessionDir(cameraId);
  if (!dir) return json(res, 404, { error: "Stream session topilmadi" });
  touchSession(cameraId); // ko'rish davom etayotganini bildiradi — idle timeout qayta boshlanadi

  const filePath = join(dir, file);
  if (!existsSync(filePath)) return json(res, 404, { error: "Fayl topilmadi" });

  const contentType = extname(file) === ".m3u8" ? "application/vnd.apple.mpegurl" : "video/mp2t";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": statSync(filePath).size,
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  createReadStream(filePath).pipe(res);
}

export function startGatewayServer() {
  const server = createServer((req, res) => {
    void (async () => {
      // HLS fayllari alohida (token-based) auth ishlatadi — control-plane
      // bearer tekshiruvidan oldin ajratib olamiz.
      if (req.method === "GET" && req.url?.startsWith("/hls/")) {
        return serveHlsFile(req, res);
      }

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
          const body = await readBody(req) as TargetBody;
          if (!body.camera_id) return json(res, 400, { error: "camera_id kerak" });
          try {
            const rtspUrl = await resolveRtspUrl(body);
            const { token } = await startHlsSession(body.camera_id, rtspUrl);
            return json(res, 200, {
              hls_url: `${PUBLIC_URL}/hls/${encodeURIComponent(body.camera_id)}/index.m3u8?token=${token}`,
              // Idle-timeout bilan mos: harakatsiz qolsa ~60s'dan keyin session yopiladi,
              // lekin har playlist/segment so'rovi timerni qayta boshlaydi (touchSession)
              expires_at: new Date(Date.now() + 55_000).toISOString(),
            });
          } catch (e) {
            return json(res, 502, { error: e instanceof Error ? e.message : "HLS session boshlanmadi" });
          }
        }

        if (req.method === "POST" && req.url === "/stream/stop") {
          const body = await readBody(req) as TargetBody;
          if (body.camera_id) stopHlsSession(body.camera_id);
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
