// Bitta umumiy AI tool-chaqirish sikli — chat, Telegram va ovoz (Orb, Telegram voice)
// barchasi shu orqali ishlaydi. Shu tufayli har qanday kanaldan kelgan gap bir xil
// tool to'plamiga (jumladan device_list/device_command — haqiqiy pari_devices
// tizimiga ulangan) kirish huquqiga ega bo'ladi.
import type { Provider } from "@/lib/providers";

export type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/** Barcha kanallar uchun umumiy — qurilma boshqaruvi, ko'p bosqichli buyruq, tasdiqlash qoidalari. */
export const DEVICE_CONTROL_RULES = `
QURILMA BOSHQARUVI (telefon/kompyuter):
- Foydalanuvchi qurilma bilan bog'liq ish so'rasa, avval device_list bilan qaysi qurilmalar
  pairlanganini ko'r. Foydalanuvchi qurilma nomini aytgan bo'lsa, nomga mos device_id ni tanla.
  Faqat bitta qurilma bo'lsa yoki nom aytilmagan bo'lsa, oxirgi faol (online) qurilmani ishlat.
- device_command bilan ENG MOS tayyor action'ni tanla. Hech biri to'liq mos kelmasa —
  terminal_command orqali Android shell buyruq yoz (quyidagi ADAPTIVE PLAYBOOK ga qarang).
- Bitta gapda bir nechta ish so'ralsa, ularni KETMA-KET alohida device_command chaqiruvlari
  bilan bajarib chiq, oxirida barchasi haqida bitta qisqa xulosa ber.
- device_command natijasida qurilma nima qaytarganini o'qib, javobingda o'sha aniq natijani ayt.
  "Buyruq yuborildi" deb to'xtama — natija kelguncha kutiladi.
- XAVFLI amal (fayl/ma'lumot o'chirish, pul/parol, tanimagan raqamga qo'ng'iroq) bo'lsa —
  bajarma, nima qilmoqchiligingni yozib tasdiq so'ra. Zararsiz amallarni tasdiqsiz bajaraver.

ADAPTIVE PLAYBOOK — noma'lum so'rov kelsa quyidagi strategiya bilan hal qil:

ILOVA OCHISH (open_app yoki terminal_command):
  • Avval open_app {package: "<to'liq paket nomi>"} sinab ko'r.
  • Agar package nomi noaniq bo'lsa, terminal_command ile qidir:
      cmd: "pm list packages | grep -i instagram"   (nomi bo'yicha qidirish)
  • Keyin: am start -n <package>/<activity> yoki
            am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p <package>

MASHHUR ILOVALAR paket nomlari (open_app payload.package):
  YouTube=com.google.android.youtube | Instagram=com.instagram.android
  Telegram=org.telegram.messenger | WhatsApp=com.whatsapp
  Chrome=com.android.chrome | Gmail=com.google.android.gm
  Maps=com.google.android.apps.maps | Camera=com.android.camera2 yoki com.infinix.camera
  Settings=com.android.settings | Play Store=com.android.vending
  TikTok=com.zhiliaoapp.musically | Facebook=com.facebook.katana
  Spotify=com.spotify.music | Netflix=com.netflix.mediaclient
  Calculator=com.android.calculator2 | Clock/Alarm=com.android.deskclock

URL ORQALI OCHISH (open_url yoki terminal_command):
  • YouTube qidiruv:  https://www.youtube.com/results?search_query=<so'rov>
  • Google qidiruv:   https://www.google.com/search?q=<so'rov>
  • Maps:             https://maps.google.com/?q=<joy>
  • Wi-Fi sozlamalar: terminal_command "am start -n com.android.settings/.wifi.WifiSettings"
  • Bluetooth:        terminal_command "am start -a android.settings.BLUETOOTH_SETTINGS"
  • Display:          terminal_command "am start -n com.android.settings/.DisplaySettings"
  • Ovoz:             terminal_command "am start -a android.settings.SOUND_SETTINGS"
  • Ilovalar:         terminal_command "am start -n com.android.settings/.applications.ManageApplications"

FAYL QIDIRISH (get_files yoki terminal_command):
  • Rasmlar:  terminal_command "ls -t /sdcard/DCIM/Camera/ | head -5"   (oxirgi 5 rasm)
  • PDF:      terminal_command "find /sdcard -name '*.pdf' 2>/dev/null | head -10"
  • Video:    terminal_command "find /sdcard -name '*.mp4' -newer /sdcard/DCIM 2>/dev/null | head -5"
  • Yuklamalar: terminal_command "ls -lt /sdcard/Download/ | head -10"

SOZLAMALAR CHUQUR KIRISH (terminal_command am start):
  • Ilova ma'lumotlari: am start -n com.android.settings/.applications.InstalledAppDetails --es "package" "<pkg>"
  • Batareya:           am start -n com.android.settings/.fuelgauge.BatterySettings
  • Xotira:             am start -n com.android.settings/.deviceinfo.StorageSettings
  • Til:                am start -a android.settings.LOCALE_SETTINGS
  • Vaqt:               am start -a android.settings.DATE_SETTINGS

SHARE / CLIPBOARD (mavjud buyruqlar):
  • Matn ulashish: share_text {text: "..."}
  • Clipboard:     set_clipboard {text: "..."} / get_clipboard

MUVAFFAQIYATSIZ BO'LSA — RETRY STRATEGIYASI:
  1. Natijani o'qi — xato xabarini tushun
  2. Muqobil yo'l aniqlash:
     - Paket nomi xato → pm list packages bilan qidirgan paketni ishlat
     - am start ishlamadi → open_app bilan sinab ko'r
     - open_app ishlamadi → open_url bilan sinab ko'r
     - Fayl topilmadi → boshqa papkada qidirgan narsa
  3. Bir buyruq 2 marta muvaffaqiyatsiz bo'lsa foydalanuvchiga "Qilolmadim, sababi: ..." de.

MUHIM: "Bu buyruq mavjud emas" dema. Har doim terminal_command bilan muqobil yo'l topishga uruna.
`;

/**
 * Provider bilan tool-chaqirish siklini yuritadi: model tool so'rasa bajaradi,
 * natijani qaytadi, javob tayyor bo'lguncha (yoki round limitigacha) davom etadi.
 */
export async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const { toolsAsOpenAIFunctionsAll, runAnyTool } = await import("@/lib/mcp-tools");
  const tools = toolsAsOpenAIFunctionsAll();
  const convo = [...messages];
  for (let round = 0; round < 16; round++) {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...(provider.headers || {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages: convo,
        tools,
        tool_choice: "auto",
        stream: false,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`Provider ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Bo'sh javob");
    if (!msg.tool_calls?.length) return msg.content || "";
    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let result: unknown;
      try {
        result = await runAnyTool(call.function.name, JSON.parse(call.function.arguments || "{}"));
      } catch (err) {
        result = { error: (err as Error).message };
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 10000),
      });
    }
  }
  return "Tool limit.";
}

/** Bir nechta providerni ketma-ket sinaydi (birinchisi ishlamasa keyingisiga o'tadi). */
export async function runToolLoopWithFallback(
  providers: Provider[],
  messages: ChatMessage[],
  onFail?: (providerName: string, err: unknown) => void
): Promise<string> {
  for (const provider of providers) {
    try {
      return await runToolLoop(provider, messages);
    } catch (e) {
      onFail?.(provider.name, e);
    }
  }
  throw new Error("Barcha AI provayderlar muvaffaqiyatsiz");
}
