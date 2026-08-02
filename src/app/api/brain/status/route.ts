import { NextResponse } from "next/server";
import { ENV, envAny } from "@/lib/env";

/** Self-contained — no circular imports */
export async function GET() {
  const connections = [
    { id: "supabase", name: "Supabase", ok: Boolean(ENV.supabaseUrl() && ENV.supabaseKey()) },
    { id: "telegram", name: "Telegram", ok: Boolean(ENV.telegram()) },
    { id: "github", name: "GitHub", ok: Boolean(ENV.github()) },
    { id: "groq", name: "Groq", ok: Boolean(ENV.groq()) },
    { id: "gemini", name: "Gemini", ok: Boolean(ENV.gemini()) },
    { id: "openai", name: "OpenAI", ok: Boolean(ENV.openai()) },
    { id: "elevenlabs", name: "ElevenLabs", ok: Boolean(ENV.elevenlabs()) },
    {
      id: "railway",
      name: "Railway",
      ok: envAny("RAILWAY_ENVIRONMENT", "RAILWAY_PUBLIC_DOMAIN", "RAILWAY_PROJECT_ID"),
    },
    { id: "internet", name: "Internet", ok: true },
    { id: "hermes", name: "Hermes", ok: true },
  ];

  const tools = [
    "list_connections",
    "list_mcp_tools",
    "telegram_send",
    "telegram_get_me",
    "web_search",
    "web_fetch",
    "extract_emails",
    "extract_social_links",
    "extract_images",
    "extract_page_text",
    "extract_list",
    "knowledge_search",
    "knowledge_save",
    "create_task",
    "get_business_overview",
    "create_file",
    "read_file",
    "propose_code_change",
    "railway_info",
    "datetime",
  ];

  return NextResponse.json({
    ok: true,
    deploy_check: "inventory-v2",
    connections,
    connected: connections.filter((c) => c.ok).map((c) => c.name),
    disconnected: connections.filter((c) => !c.ok).map((c) => c.name),
    tools,
    domain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
  });
}
