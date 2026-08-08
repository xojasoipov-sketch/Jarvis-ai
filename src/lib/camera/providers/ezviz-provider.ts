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

// ─── Normalized error codes (46-band: raw EZVIZ xatolarini oshkor qilmaslik) ──
export type EzvizErrorCode =
  | "EZVIZ_AUTH_ERROR"
  | "EZVIZ_TOKEN_EXPIRED"
  | "EZVIZ_RATE_LIMIT"
  | "EZVIZ_DEVICE_NOT_FOUND"
  | "EZVIZ_DEVICE_OFFLINE"
  | "EZVIZ_STREAM_ERROR"
  | "EZVIZ_SNAPSHOT_ERROR"
  | "EZVIZ_CAPABILITY_UNSUPPORTED"
  | "EZVIZ_NETWORK_ERROR"
  | "EZVIZ_UNKNOWN_ERROR";

export class EzvizError extends Error {
  code: EzvizErrorCode;
  constructor(code: EzvizErrorCode, message: string) {
    super(message);
    this.name = "EzvizError";
    this.code = code;
  }
}

// EZVIZ rasmiy error kodlari: https://open.ys7.com/help/1772
// 10002=token invalid, 10005=token expired, 20002=device not exist,
// 20007=device offline, 60019=rate limit
const CODE_MAP: Record<string, EzvizErrorCode> = {
  "10002": "EZVIZ_TOKEN_EXPIRED",
  "10005": "EZVIZ_TOKEN_EXPIRED",
  "10017": "EZVIZ_AUTH_ERROR",
  "20002": "EZVIZ_DEVICE_NOT_FOUND",
  "20007": "EZVIZ_DEVICE_OFFLINE",
  "20014": "EZVIZ_DEVICE_OFFLINE",
  "60019": "EZVIZ_RATE_LIMIT",
  "49999": "EZVIZ_RATE_LIMIT",
};

function isAuthError(code: EzvizErrorCode): boolean {
  return code === "EZVIZ_TOKEN_EXPIRED" || code === "EZVIZ_AUTH_ERROR";
}

function normalizeCode(ezvizCode: string): EzvizErrorCode {
  return CODE_MAP[ezvizCode] || "EZVIZ_UNKNOWN_ERROR";
}

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

// ─── Low-level request wrapper: timeout, network-error normalize ─────────────
async function ezvizFetch(path: string, params: Record<string, string>, timeoutMs: number): Promise<{ code: string; msg?: string; data?: unknown }> {
  try {
    const res = await fetch(`${EZVIZ_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      throw new EzvizError("EZVIZ_NETWORK_ERROR", `EZVIZ HTTP xato: ${res.status}`);
    }
    return await res.json() as { code: string; msg?: string; data?: unknown };
  } catch (e) {
    if (e instanceof EzvizError) throw e;
    throw new EzvizError("EZVIZ_NETWORK_ERROR", e instanceof Error ? e.message : "EZVIZ tarmoq xatosi");
  }
}

// ─── Token management ─────────────────────────────────────────────────────────
async function fetchFreshToken(appKey: string, appSecret: string): Promise<string> {
  const data = await ezvizFetch("/token/get", { appKey, appSecret }, 12000) as {
    code: string; msg?: string; data?: { accessToken: string; expireTime: number };
  };

  if (data.code !== "200" || !data.data?.accessToken) {
    const code = normalizeCode(data.code);
    throw new EzvizError(
      code === "EZVIZ_UNKNOWN_ERROR" ? "EZVIZ_AUTH_ERROR" : code,
      "EZVIZ autentifikatsiya xatosi. open.ys7.com da appKey/appSecret'ni tekshiring.",
    );
  }

  const token = data.data.accessToken;
  const expiresAt = data.data.expireTime; // milliseconds timestamp
  tokenCache.set(appKey, { token, expiresAt });
  return token;
}

async function getToken(appKey: string, appSecret: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = tokenCache.get(appKey);
    // Token muddatidan 5 daqiqa oldin yangilash
    if (cached && cached.expiresAt > Date.now() + 300_000) {
      return cached.token;
    }
  } else {
    tokenCache.delete(appKey);
  }
  return fetchFreshToken(appKey, appSecret);
}

// ─── Auth-retry wrapper: token expired/invalid bo'lsa 1 marta yangi token bilan qayta urinadi ─
async function withAuthRetry<T>(
  appKey: string,
  appSecret: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getToken(appKey, appSecret);
  try {
    return await fn(token);
  } catch (e) {
    if (e instanceof EzvizError && isAuthError(e.code)) {
      // Token invalidate qilib, bitta marta qayta urinamiz (infinite retry yo'q)
      const freshToken = await getToken(appKey, appSecret, true);
      return await fn(freshToken);
    }
    throw e;
  }
}

// ─── Device list from EZVIZ account ──────────────────────────────────────────
export async function fetchEzvizDevices(appKey: string, appSecret: string): Promise<EzvizDevice[]> {
  return withAuthRetry(appKey, appSecret, async (token) => {
    const all: EzvizDevice[] = [];
    let page = 0;
    const pageSize = 10;

    for (let i = 0; i < 20; i++) {
      const data = await ezvizFetch("/device/list", {
        accessToken: token,
        pageStart: String(page),
        pageSize: String(pageSize),
      }, 15000) as { code: string; msg?: string; data?: { deviceInfos: EzvizDevice[] } };

      if (data.code !== "200") {
        const code = normalizeCode(data.code);
        if (isAuthError(code)) throw new EzvizError(code, "EZVIZ token amal qilish muddati tugagan");
        break;
      }
      const items = data.data?.deviceInfos || [];
      all.push(...items);
      if (items.length < pageSize) break;
      page++;
    }

    return all;
  });
}

// ─── Device detail ────────────────────────────────────────────────────────────
async function fetchDeviceInfo(appKey: string, appSecret: string, serial: string): Promise<{ status: number; name?: string }> {
  return withAuthRetry(appKey, appSecret, async (token) => {
    const data = await ezvizFetch("/device/info", { accessToken: token, deviceSerial: serial }, 10000) as {
      code: string; data?: { status: number; deviceName?: string };
    };
    if (data.code !== "200") {
      const code = normalizeCode(data.code);
      throw new EzvizError(code, `Qurilma holatini olib bo'lmadi: ${data.code}`);
    }
    return { status: data.data?.status ?? 0, name: data.data?.deviceName };
  });
}

// ─── EzvizProvider ────────────────────────────────────────────────────────────
export class EzvizProvider implements ICameraProvider {
  readonly name = "ezviz";

  async connect(camera: Camera, creds: Record<string, string>): Promise<boolean> {
    const { app_key, app_secret } = creds;
    if (!app_key || !app_secret) {
      throw new EzvizError(
        "EZVIZ_AUTH_ERROR",
        "EZVIZ credentials yetishmayapti. Kerak: app_key va app_secret. Qayerdan olish: https://open.ys7.com → Ilovalar → Yangi ilova",
      );
    }
    await getToken(app_key, app_secret); // throws EzvizError on failure
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
      const info = await fetchDeviceInfo(app_key, app_secret, serial);
      return info.status === 1 ? "online" : "offline";
    } catch (e) {
      if (e instanceof EzvizError && e.code === "EZVIZ_DEVICE_NOT_FOUND") return "error";
      return "error";
    }
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
    if (!app_key || !app_secret || !camera.serial) return null;
    try {
      return await withAuthRetry(app_key, app_secret, async (token) => {
        const data = await ezvizFetch("/device/capture", {
          accessToken: token,
          deviceSerial: camera.serial,
          channelNo: "1",
        }, 20000) as { code: string; msg?: string; data?: { picUrl: string } };

        if (data.code !== "200" || !data.data?.picUrl) {
          const code = normalizeCode(data.code);
          throw new EzvizError(
            isAuthError(code) ? code : "EZVIZ_SNAPSHOT_ERROR",
            `Snapshot olinmadi: ${data.code} ${data.msg || ""}`.trim(),
          );
        }
        return { url: data.data.picUrl, taken_at: new Date().toISOString() };
      });
    } catch (e) {
      console.error(`[EZVIZ snapshot error] ${camera.name}:`, e instanceof EzvizError ? `${e.code} ${e.message}` : e);
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
      return await withAuthRetry(app_key, app_secret, async (token) => {
        // protocol=2 → HLS (Telegram Mini App uchun eng mos)
        // protocol=1 → RTMP
        // protocol=3 → RTSP (local network only)
        const data = await ezvizFetch("/live/address/get", {
          accessToken: token,
          deviceSerial: camera.serial,
          channelNo: "1",
          protocol: "2",    // HLS
          quality: "1",     // 1=main, 2=sub
        }, 12000) as { code: string; msg?: string; data?: { url: string; expireTime?: number } };

        if (data.code !== "200" || !data.data?.url) {
          const code = normalizeCode(data.code);
          throw new EzvizError(
            isAuthError(code) ? code : "EZVIZ_STREAM_ERROR",
            `Stream olinmadi: ${data.code} ${data.msg || ""}`.trim(),
          );
        }
        return {
          hls_url: data.data.url,
          expires_at: data.data.expireTime ? new Date(data.data.expireTime).toISOString() : undefined,
        };
      });
    } catch (e) {
      console.error(`[EZVIZ stream error] ${camera.name}:`, e instanceof EzvizError ? `${e.code} ${e.message}` : e);
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
        error: e instanceof EzvizError ? `${e.code}: ${e.message}` : (e instanceof Error ? e.message : "Unknown error"),
        checked_at: new Date().toISOString(),
      };
    }
  }
}
