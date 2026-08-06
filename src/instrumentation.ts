/**
 * Next.js Instrumentation — server ishga tushganda bir marta chaqiriladi
 * Telegram webhook ni avtomatik o'rnatadi
 */
export async function register() {
  // Faqat Node.js runtime da (Edge da emas)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : null)
  )?.trim();

  if (!token || !appUrl) {
    console.log("[instrumentation] TG webhook o'rnatilmadi: token yoki URL yo'q");
    return;
  }

  const webhookUrl = `${appUrl}/api/telegram`;
  const api = `https://api.telegram.org/bot${token}`;

  console.log("[instrumentation] Webhook URL:", webhookUrl);

  try {
    // 1. Webhook o'rnatish
    const whRes = await fetch(`${api}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      }),
    });
    const whData = (await whRes.json()) as { ok: boolean; description?: string };
    if (whData.ok) {
      console.log(`[instrumentation] ✅ TG webhook o'rnatildi: ${webhookUrl}`);
    } else {
      console.warn("[instrumentation] TG webhook xato:", whData.description, "| status:", whRes.status);
      const infoRes = await fetch(`${api}/getWebhookInfo`);
      const info = await infoRes.json() as { result?: { url?: string } };
      console.log("[instrumentation] Hozirgi webhook:", info?.result?.url || "yo'q");
    }

    // 2. Bot commandlarini o'rnatish
    const cmdRes = await fetch(`${api}/setMyCommands`, {
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
    const cmdData = await cmdRes.json() as { ok: boolean };
    console.log("[instrumentation] setMyCommands:", cmdData.ok ? "✅" : "❌");

    // 3. Mini App menyu tugmasi
    const menuRes = await fetch(`${api}/setChatMenuButton`, {
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
    const menuData = await menuRes.json() as { ok: boolean };
    console.log("[instrumentation] setChatMenuButton:", menuData.ok ? "✅" : "❌");

  } catch (e) {
    console.error("[instrumentation] TG setup xato:", e);
  }
}
