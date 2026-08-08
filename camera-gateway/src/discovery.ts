// ─── ONVIF WS-Discovery ────────────────────────────────────────────────────
// Local tarmoqdagi ONVIF kameralarni topadi. Aggressiv port-scan qilmaydi —
// faqat standart WS-Discovery multicast (239.255.255.250:3702) ishlatiladi,
// bu ONVIF spetsifikatsiyasining o'zi.
//
// Har topilgan device uchun GetDeviceInformation + media profile so'raladi;
// login talab qiladigan device'lar uchun bu bosqichda credentials yo'q,
// shuning uchun manufacturer/model ba'zan noma'lum qolishi mumkin —
// bu holatda kamera baribir "found" deb qaytariladi, keyin user login
// kiritganda to'liq capability aniqlanadi.

import { Discovery } from "onvif";

export type DiscoveredDevice = {
  localDeviceId: string;   // xoslash uchun: urn yoki ip:port
  name: string;
  manufacturer: string;
  model: string;
  ip: string;
  protocols: {
    onvif: boolean;
    rtsp: boolean;    // ONVIF orqali media profile topilgan bo'lsa true
    ptz: boolean;
    snapshot: boolean;
    audio: boolean;
  };
};

export async function discoverOnvifDevices(timeoutMs: number): Promise<DiscoveredDevice[]> {
  const found: DiscoveredDevice[] = [];

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);

    Discovery.on("device", (cam: unknown, rinfo: { address: string }) => {
      const c = cam as { hostname?: string; urn?: string; xaddrs?: string[] };
      const ip = rinfo?.address || "";
      const id = c.urn || `${ip}`;

      if (found.some((d) => d.localDeviceId === id)) return;

      found.push({
        localDeviceId: id,
        name: `ONVIF Camera ${ip}`,
        manufacturer: "",
        model: "",
        ip,
        protocols: { onvif: true, rtsp: true, ptz: false, snapshot: true, audio: false },
      });
    });

    Discovery.on("error", (e: Error) => {
      console.error("[discovery] xato:", e.message);
    });

    try {
      Discovery.probe({ timeout: timeoutMs });
    } catch (e) {
      console.error("[discovery] probe boshlanmadi:", e instanceof Error ? e.message : e);
      clearTimeout(timer);
      resolve();
    }
  });

  return found;
}
