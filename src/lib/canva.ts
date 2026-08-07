/**
 * Canva Connect API integration
 * CANVA_CLIENT_ID     — https://www.canva.com/developers/apps
 * CANVA_CLIENT_SECRET
 * CANVA_ACCESS_TOKEN  — OAuth2 access token (yoki bot token)
 *
 * Asosiy foydalanish:
 *  - Design yaratish (blank, template asosida)
 *  - Design export qilish (PNG/PDF/MP4)
 *  - Design URL olish (tahrirlash uchun)
 */

const BASE = "https://api.canva.com/rest/v1";

function headers() {
  const token = process.env.CANVA_ACCESS_TOKEN;
  if (!token) throw new Error("CANVA_ACCESS_TOKEN sozlanmagan");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function canvaConfigured() {
  return Boolean(process.env.CANVA_ACCESS_TOKEN);
}

/** Foydalanuvchi ma'lumotlari */
export async function canvaGetMe() {
  const res = await fetch(`${BASE}/users/me`, { headers: headers() });
  if (!res.ok) throw new Error(`Canva /me xatosi: ${res.status}`);
  return res.json();
}

/** Design ro'yxati */
export async function canvaListDesigns(limit = 20) {
  const res = await fetch(`${BASE}/designs?limit=${limit}`, { headers: headers() });
  if (!res.ok) throw new Error(`Canva list designs xatosi: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

/** Yangi blank design yaratish */
export async function canvaCreateDesign(params: {
  title: string;
  /** "presentation", "instagram_post", "instagram_story", "carousel" yoki custom */
  designType?: string;
  width?: number;
  height?: number;
}) {
  const body: Record<string, unknown> = { title: params.title };

  if (params.designType) {
    // Preset size types
    const presets: Record<string, { width: number; height: number }> = {
      instagram_post:    { width: 1080, height: 1080 },
      instagram_story:   { width: 1080, height: 1920 },
      instagram_carousel:{ width: 1080, height: 1080 },
      presentation:      { width: 1920, height: 1080 },
      a4:                { width: 794,  height: 1123 },
    };
    const preset = presets[params.designType];
    if (preset) {
      body.design_type = { type: "custom", width: preset.width, height: preset.height };
    } else {
      body.design_type = { type: params.designType };
    }
  } else if (params.width && params.height) {
    body.design_type = { type: "custom", width: params.width, height: params.height };
  }

  const res = await fetch(`${BASE}/designs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Canva create design xatosi: ${res.status} — ${err}`);
  }
  const data = await res.json();
  return {
    id: data.design?.id,
    title: data.design?.title,
    editUrl: data.design?.urls?.edit_url,
    viewUrl: data.design?.urls?.view_url,
  };
}

/** Design eksport (PNG, PDF, MP4) — asinxron, job qaytaradi */
export async function canvaExportDesign(designId: string, format: "png" | "pdf" | "mp4" | "gif" = "png") {
  const res = await fetch(`${BASE}/exports`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      design_id: designId,
      format: { type: format.toUpperCase() },
    }),
  });
  if (!res.ok) throw new Error(`Canva export xatosi: ${res.status}`);
  return res.json(); // { job: { id, status } }
}

/** Export job statusini tekshirish */
export async function canvaGetExportJob(jobId: string) {
  const res = await fetch(`${BASE}/exports/${jobId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Canva export job xatosi: ${res.status}`);
  return res.json();
}

/**
 * Instagram karusel uchun N ta slide yaratish.
 * Har bir slide — alohida design (1080x1080).
 * Qaytaradi: editUrl ro'yxati — har birini Canva'da tahrirlash mumkin.
 */
export async function canvaCreateCarousel(params: {
  title: string;
  slideCount: number;
  slides: { heading: string; body: string }[];
}) {
  const results = [];
  for (let i = 0; i < params.slideCount; i++) {
    const slide = params.slides[i] || { heading: `Slide ${i + 1}`, body: "" };
    const design = await canvaCreateDesign({
      title: `${params.title} — Slide ${i + 1}`,
      designType: "instagram_carousel",
    });
    results.push({ slide: i + 1, ...slide, ...design });
  }
  return results;
}
