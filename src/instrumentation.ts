/**
 * Next.js Instrumentation — server ishga tushganda bir marta chaqiriladi
 * Telegram webhook ni avtomatik o'rnatadi
 */
export async function register() {
  // Faqat Node.js runtime da (Edge da emas)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : null);

  if (!token || !appUrl) {
    console.log("[instrumentation] TG webhook o'rnatilmadi: token yoki URL yo'q");
    return;
  }

  const webhookUrl = `${appUrl}/api/telegram`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: false,
        }),
      }
    );
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (data.ok) {
      console.log(`[instrumentation] ✅ TG webhook o'rnatildi: ${webhookUrl}`);
    } else {
      console.warn("[instrumentation] TG webhook xato:", data.description);
    }

    // Bot commandlarini ham o'rnatish
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Botni ishga tushirish" },
          { command: "chat", description: "Chat rejimi" },
          { command: "agents", description: "Agent tanlash" },
          { command: "smm", description: "SMM boshqaruvi" },
          { command: "xizmatlar", description: "Xizmatlar katalogi" },
          { command: "portfolio", description: "Portfolio ko'rish" },
          { command: "zakaz", description: "Yangi zakaz berish" },
          { command: "qr", description: "Telefon ulash QR kodi" },
          { command: "status", description: "Tizim holati" },
          { command: "help", description: "Yordam va buyruqlar" },
        ],
      }),
    });

    // Mini App menyu tugmasini o'rnatish
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "🚀 Pari AI",
          web_app: { url: appUrl },
        },
      }),
    });

    console.log("[instrumentation] ✅ TG buyruqlar va menyu o'rnatildi");
  } catch (e) {
    console.error("[instrumentation] TG setup xato:", e);
  }
}
