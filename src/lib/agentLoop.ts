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
- Foydalanuvchi qurilma bilan bog'liq ish so'rasa (masalan "fonarni yoq", "Infinix'da signal qo'y",
  "batareyani tekshir", "shu faylni o'qib ber"), avval device_list bilan qaysi qurilmalar
  pairlanganini ko'r. Foydalanuvchi qurilma nomini aytgan bo'lsa (masalan "Infinix"), nomga
  mos device_id ni tanla. Faqat bitta qurilma bo'lsa yoki nom aytilmagan bo'lsa, oxirgi faol
  (online) qurilmani ishlat.
- device_command bilan ENG MOS tayyor action'ni tanla (device_command tool tavsifidagi to'liq
  ro'yxatdan). Hech biri mos kelmasa, terminal_command action orqali o'zing mos shell buyruq
  yozib ko'r (masalan fayl bilan ishlash, oddiy tekshiruv) — lekin qurilmani buzadigan yoki
  qaytarib bo'lmaydigan narsa yozma.
- Bitta gapda bir nechta ish so'ralsa (masalan "jim rejimga qo'y va onamga yozgin"), ularni
  KETMA-KET, alohida device_command chaqiruvlari bilan bajarib chiq, oxirida barchasi haqida
  bitta qisqa xulosa ber.
- XAVFLI amal (fayl/ma'lumot o'chirish, sozlamani qaytarib bo'lmas o'zgartirish, pul/parol bilan
  bog'liq, tanimagan raqamga qo'ng'iroq/pul) bo'lsa — DARHOL bajarma. Nima qilmoqchi ekaningni
  aniq yoz va tasdiq so'ra ("Ha" desa keyingi xabaringda bajar). Oddiy, zararsiz amallarni
  (holat so'rash, bildirishnoma, fonarcha, tovush, brauzer ochish va h.k.) darhol bajaraver,
  tasdiq so'rama.
- device_command natijasida qurilma haqiqatan nima qaytarganini o'qib, javobingda o'sha
  aniq natijani ayt (masalan batareya foizi, fayl mazmuni) — "buyruq yuborildi" deb
  to'xtama, natija kelguncha kutiladi.
`;

/**
 * Provider bilan tool-chaqirish siklini yuritadi: model tool so'rasa bajaradi,
 * natijani qaytadi, javob tayyor bo'lguncha (yoki round limitigacha) davom etadi.
 */
export async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const { toolsAsOpenAIFunctionsAll, runAnyTool } = await import("@/lib/mcp-tools");
  const tools = toolsAsOpenAIFunctionsAll();
  const convo = [...messages];
  for (let round = 0; round < 8; round++) {
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
