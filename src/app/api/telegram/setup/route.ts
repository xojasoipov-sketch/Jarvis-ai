import { NextRequest, NextResponse } from "next/server";
import { setWebhook, deleteWebhook, getWebhookInfo, getMe } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const { action, appUrl } = await req.json();

  if (action === "set") {
    const url = `${appUrl || process.env.NEXT_PUBLIC_APP_URL}/api/telegram`;
    const [webhookRes, botInfo] = await Promise.all([setWebhook(url), getMe()]);
    return NextResponse.json({ webhook: webhookRes, bot: botInfo });
  }

  if (action === "delete") {
    const res = await deleteWebhook();
    return NextResponse.json(res);
  }

  if (action === "info") {
    const [info, botInfo] = await Promise.all([getWebhookInfo(), getMe()]);
    return NextResponse.json({ webhook: info, bot: botInfo });
  }

  return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
}
