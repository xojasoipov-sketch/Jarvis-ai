import { redirect } from "next/navigation";

/** HUD alohida emas — asosiy chat ichida */
export default function HudRedirect() {
  redirect("/chat");
}
