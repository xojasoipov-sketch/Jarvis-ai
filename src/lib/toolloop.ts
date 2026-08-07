// Umumiy function-calling loop — tool-capable provider (masalan Groq) orqali
// AGENTS/chat/telegram barchasi shu yerdan foydalanadi
import { toolsAsOpenAIFunctions, runTool } from "@/lib/tools";
import type { Provider } from "@/lib/providers";

export type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

// Tool-capable provider bilan haqiqiy function-calling loop ishga tushiradi.
// Model vositalarni chaqirishni to'xtatgach, yakuniy matnni qaytaradi.
export async function runToolLoop(provider: Provider, messages: ChatMessage[]): Promise<string> {
  const tools = toolsAsOpenAIFunctions();
  const convo = [...messages];

  for (let i = 0; i < 8; i++) {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({ model: provider.model, messages: convo, tools, tool_choice: "auto", stream: false }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Bo'sh javob");

    if (!msg.tool_calls?.length) {
      return msg.content || "";
    }

    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let result: unknown;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        result = await runTool(call.function.name, args);
      } catch (err) {
        result = { error: (err as Error).message };
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return "Kechirasiz, vositalar bilan ishlashda cheklovga yetdim. Qaytadan aniqroq so'rang.";
}
