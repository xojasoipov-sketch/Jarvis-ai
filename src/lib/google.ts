/**
 * Google Calendar + Drive integration (Service Account yoki OAuth2)
 *
 * Service Account (server-side, tavsiya etiladi):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----)
 *   GOOGLE_CALENDAR_ID  (odatda email@gmail.com yoki primary)
 *   GOOGLE_DRIVE_FOLDER_ID  (ixtiyoriy, yuklangan fayllar joyi)
 *
 * OAuth2 (foydalanuvchi tomonidan):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 */

// ── Token cache ───────────────────────────────────────────────────────────────
let _accessToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken;

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Google OAuth sozlanmagan: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN kerak");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Google token xatosi: ${res.status}`);
  const data = await res.json();
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _accessToken!;
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID);
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────

/** Taqvim hodisalarini olish */
export async function calendarListEvents(
  maxResults = 10,
  timeMin?: string,
  timeMax?: string
) {
  const token = await getAccessToken();
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    orderBy: "startTime",
    singleEvents: "true",
    timeMin: timeMin || new Date().toISOString(),
    ...(timeMax ? { timeMax } : {}),
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Calendar list xatosi: ${res.status}`);
  const data = await res.json();
  return (data.items || []) as Record<string, unknown>[];
}

/** Yangi hodisa yaratish */
export async function calendarCreateEvent(event: {
  summary: string;
  description?: string;
  start: string;   // ISO datetime
  end: string;     // ISO datetime
  location?: string;
}) {
  const token = await getAccessToken();
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.start, timeZone: "Asia/Tashkent" },
        end: { dateTime: event.end, timeZone: "Asia/Tashkent" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Calendar create xatosi: ${res.status}`);
  return res.json();
}

/** Hodisani o'chirish */
export async function calendarDeleteEvent(eventId: string) {
  const token = await getAccessToken();
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
}

// ── DRIVE ─────────────────────────────────────────────────────────────────────

/** Fayl yuklash (multipart) */
export async function driveUploadFile(
  fileName: string,
  content: string | Buffer,
  mimeType = "text/plain"
): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const metadata = JSON.stringify({
    name: fileName,
    ...(folderId ? { parents: [folderId] } : {}),
  });

  const bodyBuf: Buffer = Buffer.isBuffer(content) ? (content as Buffer) : Buffer.from(content as string, "utf-8");
  const boundary = "jarvis_boundary_xyz";
  const multipart = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    bodyBuf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    }
  );
  if (!res.ok) throw new Error(`Drive upload xatosi: ${res.status}`);
  return res.json();
}

/** Fayl qidirish */
export async function driveSearchFiles(query: string, limit = 10) {
  const token = await getAccessToken();
  const q = encodeURIComponent(`name contains '${query}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${limit}&fields=files(id,name,mimeType,webViewLink,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive search xatosi: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}
