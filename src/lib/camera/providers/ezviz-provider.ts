// ─── EZVIZ Open Platform Provider ────────────────────────────────────────────
// API docs: https://open.ys7.com/help/index
// Endpoint: https://open.ys7.com/api/lapp/
//
// Setup:
//   1. open.ys7.com ga ro'yxatdan o'ting
//   2. "Ilovalar" → yangi app yarating → appKey + appSecret oling
//   3. EZVIZ_APP_KEY=... va EZVIZ_APP_SECRET=... ni env'ga qo'shing
//   4. "Qurilmalar" bo'limida kameralaringizni appga qo'shing
//      YO kameralar avto-import qilinadi (accountdagi barcha devices)
//
// EZVIZ API kodi "200" = muvaffaqiyat (HTTP 200 emas, response.code)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Camera, CameraCapabilities, CameraStatus,
  HealthCheckResult, ICameraProvider, SnapshotResult, StreamInfo,
} from "../types";

// ─── EZVIZ API Region URLs ────────────────────────────────────────────────────
// China: https://open.ys7.com
// International regions ham shu URL ishlatadi (2024 holatda)
const EZVIZ_BASE = (process.env.EZVIZ_API_URL || "https://open.ys7.com").replace(/\/$/, "");
const EZVIZ_API = `${EZVIZ_BASE}/api/lapp`;

// ─── In-memory token cache (server restart'da yo'qoladi, shuning uchun DB ham) ─
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// ─── EZVIZ device list item ───────────────────────────────────────────────────
export type EzvizDevice = {
  deviceSerial: string;
  deviceName: string;
  deviceType?: string;
  status: number;        // 0=offline, 1=online
  deviceVersion?: string;
  supportPtz?: number;
  supportAudio?: number;
  channelNumber?: number;
};

// ─── Token management ─────────────────────────────────────────────────────────
async function getToken(appKey: string, appSecret: string): Promise<string> {
  const cacheKey = appKey;
  const cached = tokenCache.get(cacheKey);
  // Token muddatidan 5 daqiqa oldin yangilash
  if (cached && cached.expiresAt > Date.now() + 300_000) {
    return cached.token;
  }

  const res = await fetch(`${EZVIZ_API}/token/get`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ appKey, appSecret }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`EZVIZ token HTTP xato: ${res.status}`);
  }

  const data = await res.json() as {
    code: string;
    msg?: string;
    data?: { accessToken: string; expireTime: number };
  };

  if (data.code !== "200" || !data.data?.accessToken) {
    const msg = data.msg || data.code;
    throw new Error(`EZVIZ autentifikatsiya xatosi: ${msg}. open.ys7.com da appKey/appSecret'ni tekshiring.`);
  }

  const token = data.data.accessToken;
  const expiresAt = data.data.expireTime; // milliseconds timestamp
  tokenCache.set(cacheKey, { token, expiresAt });
  return token;
}

// ─── Device list from EZVIZ account ──────────────────────────────────────────
export async function fetchEzvizDevices(appKey: string, appSecret: string): Promise<EzvizDevice[]> {
  const token = await getToken(appKey, appSecret);
  const all: EzvizDevice[] = [];
  let page = 0;
  const pageSize = 10;

  // pagination loop
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${EZVIZ_API}/device/list`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        accessToken: token,
        pageStart: String(page),
        pageSize: String(pageSize),
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json() as {
      code: string;
      msg?: string;
      data?: { deviceInfos: EzvizDevice[]; page?: { total: number } };
    };

    if (data.code !== "200") break;
    const items = data.data?.deviceInfos || [];
    all.push(...items);
    if (items.length < pageSize) break;
    page++;
  }

  return all;
}

// ─── Device detail ────────────────────────────────────────────────────────────
async function fetchDeviceInfo(token: string, serial: string): Promise<{ status: number; name?: string } | null> {
  const res = await fetch(`${EZVIZ_API}/device/info`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ accessToken: token, deviceSerial: serial }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json() as { code: string; data?: { status: number; deviceName?: string } };
  if (data.code !== "200") return null;
  return { status: data.data?.status ?? 0, name: data.data?.deviceName };
}

// ─── EzvizProvider ────────────────────────────────────────────────────────────
export class EzvizProvider implements ICameraProvider {
  readonly name = "ezviz";

  async connect(camera: Camera, creds: Record<string, string>): Promise<boolean> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) {
      throw new Error(
        "EZVIZ credentials yetishmayapti.\n" +
        "Kerak: app_key va app_secret\n" +
        "Qayerdan olish: https://open.ys7.com → Ilovalar → Yangi ilova",
      );
    }
    await getToken(app_key, app_secret); // throws on failure
    return true;
  }

  async disconnect(_camera_id: string): Promise<void> {
    // EZVIZ stateless token — alohida disconnect API yo'q
  }

  async getStatus(camera: Camera, creds: Record<string, string>): Promise<CameraStatus> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) return "unknown";
    const serial = camera.serial || (camera.metadata?.serial as string);
    if (!serial) return "unknown";
    try {
      const token = await getToken(app_key, app_secret);
      const info = await fetchDeviceInfo(token, serial);
      if (!info) return "error";
      return info.status === 1 ? "online" : "offline";
    } catch { return "error"; }
  }

  async getCapabilities(camera: Camera, creds: Record<string, string>): Promise<CameraCapabilities> {
    // EZVIZ capabilities camera modeli va firmware'ga bog'liq.
    // metadata.ptz va metadata.audio maydonlarini saqlang.
    const ptz = Boolean(camera.metadata?.support_ptz);
    const audio = Boolean(camera.metadata?.support_audio);
    return {
      live: true,
      snapshot: true,
      recording: false,    // Cloud recording EZVIZ Plus subscription talab qiladi
      audio,
      ptz,
      motion_detection: true,
      rtsp: Boolean(camera.rtsp_url), // Faqat agar user rtsp_url qo'shgan bo'lsa
    };
  }

  async getSnapshot(camera: Camera, creds: Record<string, string>): Promise<SnapshotResult | null> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) return null;
    const serial = camera.serial;
    if (!serial) return null;
    try {
      const token = await getToken(app_key, app_secret);
      const res = await fetch(`${EZVIZ_API}/device/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          accessToken: token,
          deviceSerial: serial,
          channelNo: "1",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json() as { code: string; msg?: string; data?: { picUrl: string } };
      if (data.code !== "200" || !data.data?.picUrl) {
        console.error(`[EZVIZ snapshot] ${camera.name}: code=${data.code} msg=${data.msg}`);
        return null;
      }
      return { url: data.data.picUrl, taken_at: new Date().toISOString() };
    } catch (e) {
      console.error(`[EZVIZ snapshot error] ${camera.name}:`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  async getStreamInfo(camera: Camera, creds: Record<string, string>): Promise<StreamInfo | null> {
    // RTSP to'g'ridan-to'g'ri berilgan bo'lsa — uni ishlatamiz
    if (camera.rtsp_url) {
      return { rtsp_url: camera.rtsp_url };
    }

    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret || !camera.serial) return null;

    try {
      const token = await getToken(app_key, app_secret);
      // protocol=2 → HLS (Telegram Mini App uchun eng mos)
      // protocol=1 → RTMP
      // protocol=3 → RTSP (local network only)
      const res = await fetch(`${EZVIZ_API}/live/address/get`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          accessToken: token,
          deviceSerial: camera.serial,
          channelNo: "1",
          protocol: "2",    // HLS
          quality: "1",     // 1=main, 2=sub
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json() as { code: string; msg?: string; data?: { url: string; expireTime?: number } };
      if (data.code !== "200" || !data.data?.url) {
        console.error(`[EZVIZ stream] ${camera.name}: code=${data.code} msg=${data.msg}`);
        return null;
      }
      return {
        hls_url: data.data.url,
        expires_at: data.data.expireTime ? new Date(data.data.expireTime).toISOString() : undefined,
      };
    } catch (e) {
      console.error(`[EZVIZ stream error] ${camera.name}:`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  async healthCheck(camera: Camera, creds: Record<string, string>): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const status = await this.getStatus(camera, creds);
      return {
        camera_id: camera.id,
        status,
        latency_ms: Date.now() - start,
        checked_at: new Date().toISOString(),
      };
    } catch (e) {
      return {
        camera_id: camera.id,
        status: "error",
        latency_ms: Date.now() - start,
        error: e instanceof Error ? e.message : "Unknown error",
        checked_at: new Date().toISOString(),
      };
    }
  }
}
