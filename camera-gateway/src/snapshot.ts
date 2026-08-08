// ─── RTSP snapshot extraction (ffmpeg) ─────────────────────────────────────
// Bitta frame'ni RTSP stream'dan olib, buferga qaytaradi. Gateway host'da
// ffmpeg o'rnatilgan bo'lishi shart (apt install ffmpeg / Docker image ichida).
//
// ESLATMA: bu funksiya hozircha faqat CLI orqali qo'lda chaqiriladi
// (npm run snapshot -- <rtsp_url>). Cloud'dan on-demand chaqirish uchun
// gateway<->cloud orasida "outbound-only" tunnel kerak (31-band) — bu
// qism hali yozilmagan, README'da ochiq deb belgilangan.

import { spawn } from "node:child_process";

export function captureRtspSnapshot(rtspUrl: string, timeoutMs = 10000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const ff = spawn("ffmpeg", [
      "-rtsp_transport", "tcp",
      "-i", rtspUrl,
      "-frames:v", "1",
      "-f", "image2",
      "-q:v", "3",
      "pipe:1",
    ]);

    const timer = setTimeout(() => {
      ff.kill("SIGKILL");
      reject(new Error("ffmpeg timeout — RTSP stream javob bermadi"));
    }, timeoutMs);

    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", () => {}); // ffmpeg logi — kerak bo'lsa debug uchun yoqiladi
    ff.on("error", (e) => { clearTimeout(timer); reject(e); });
    ff.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || chunks.length === 0) {
        reject(new Error(`ffmpeg snapshot muvaffaqiyatsiz (exit code ${code})`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}
