// ─── RTSP → HLS transcoding sessions ───────────────────────────────────────
// Har bir kamera uchun alohida ffmpeg jarayoni HLS segmentlarini vaqtinchalik
// papkaga yozadi. Session'lar demand-based: birinchi /stream/start so'rovida
// boshlanadi, HLS_IDLE_TIMEOUT_MS davomida hech kim playlist so'ramasa
// avtomatik to'xtatiladi (39-band: queue/cleanup-worker printsipi — bu yerda
// soddalashtirilgan, alohida worker process emas, lekin vazifasi bir xil).

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HLS_IDLE_TIMEOUT_MS = 60_000; // 60s hech kim ko'rmasa to'xtaydi
const HLS_START_TIMEOUT_MS = 15_000; // playlist shuncha vaqtda paydo bo'lmasa xato

type HlsSession = {
  cameraId: string;
  dir: string;
  proc: ChildProcess;
  lastAccess: number;
  idleTimer: ReturnType<typeof setTimeout>;
  // CAMERA_GATEWAY_SECRET (cloud↔gateway control-plane secret) brauzerga
  // hech qachon chiqmasligi kerak. HLS'ni <video>/hls.js to'g'ridan-to'g'ri
  // GET qiladi, shuning uchun alohida, qisqa muddatli, faqat shu session
  // uchun amal qiladigan token ishlatamiz (capability-URL pattern).
  token: string;
};

const sessions = new Map<string, HlsSession>();

function resetIdleTimer(session: HlsSession) {
  clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => stopHlsSession(session.cameraId), HLS_IDLE_TIMEOUT_MS);
}

export function touchSession(cameraId: string): void {
  const s = sessions.get(cameraId);
  if (s) { s.lastAccess = Date.now(); resetIdleTimer(s); }
}

export function stopHlsSession(cameraId: string): void {
  const s = sessions.get(cameraId);
  if (!s) return;
  clearTimeout(s.idleTimer);
  s.proc.kill("SIGTERM");
  try { rmSync(s.dir, { recursive: true, force: true }); } catch { /* ignore */ }
  sessions.delete(cameraId);
  console.log(`[hls] to'xtatildi: ${cameraId}`);
}

export function getSessionDir(cameraId: string): string | null {
  return sessions.get(cameraId)?.dir ?? null;
}

// Token to'g'ri kelmasa segment/playlist berilmaydi — GET /hls/* uchun
// control-plane CAMERA_GATEWAY_SECRET o'rniga shu ishlatiladi.
export function isValidToken(cameraId: string, token: string): boolean {
  const s = sessions.get(cameraId);
  return Boolean(s && s.token === token);
}

// Playlist fayli paydo bo'lguncha kutadi (ffmpeg birinchi segmentni yozguncha)
async function waitForPlaylist(dir: string, timeoutMs: number): Promise<void> {
  const { existsSync } = await import("node:fs");
  const playlist = join(dir, "index.m3u8");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(playlist)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("HLS playlist vaqtida yaratilmadi — RTSP stream'ga ulanib bo'lmadi");
}

export type HlsHandle = { playlistPath: string; token: string };

export async function startHlsSession(cameraId: string, rtspUrl: string): Promise<HlsHandle> {
  const existing = sessions.get(cameraId);
  if (existing) { touchSession(cameraId); return { playlistPath: join(existing.dir, "index.m3u8"), token: existing.token }; }

  const dir = mkdtempSync(join(tmpdir(), `hls-${cameraId}-`));
  const token = randomBytes(16).toString("base64url");

  const proc = spawn("ffmpeg", [
    "-rtsp_transport", "tcp",
    "-i", rtspUrl,
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "4",
    "-hls_flags", "delete_segments+omit_endlist",
    "-hls_segment_filename", join(dir, "seg%03d.ts"),
    join(dir, "index.m3u8"),
  ]);

  proc.stderr.on("data", () => {}); // kerak bo'lsa debug uchun log qilinsin
  proc.on("exit", (code) => {
    console.log(`[hls] ffmpeg tugadi (${cameraId}), exit=${code}`);
    sessions.delete(cameraId);
  });

  const session: HlsSession = { cameraId, dir, proc, lastAccess: Date.now(), idleTimer: setTimeout(() => {}, 0), token };
  resetIdleTimer(session);
  sessions.set(cameraId, session);

  try {
    await waitForPlaylist(dir, HLS_START_TIMEOUT_MS);
  } catch (e) {
    stopHlsSession(cameraId);
    throw e;
  }

  return { playlistPath: join(dir, "index.m3u8"), token };
}
