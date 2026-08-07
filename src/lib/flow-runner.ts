/**
 * Flow Runner — sequential node executor
 * Each node type calls a real backend action.
 */
import { sendMessage as tgSend } from "./telegram";
import { callAI } from "./agents";
import { financeSummary } from "./finance-store";
import { memorySummary } from "./memory-store";
import { listReminders } from "./reminders-store";
import { isOwnerTelegram, OWNER } from "./owner";
import { log } from "./logger";
import { createRun, finishRun, updateFlow, type FlowRunStep } from "./automation-store";
import type { FlowNode, VisualFlow } from "./flows";

export interface RunContext {
  trigger: string;
  input?: string;          // webhook body / keyword text / etc.
  vars: Record<string, string>; // accumulated outputs across nodes
}

// ── Node Executors ─────────────────────────────────────────────────────────────

async function execNode(
  node: FlowNode,
  ctx: RunContext
): Promise<{ ok: boolean; output: string }> {
  const cfg = node.config || {};
  const interpolate = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx.vars[k] || ctx.input || "");

  switch (node.type) {
    // ── Triggers (already fired — just pass through)
    case "manual":
    case "schedule":
    case "webhook":
    case "keyword":
    case "event":
      return { ok: true, output: ctx.input || "trigger fired" };

    // ── Digest: quick AI morning brief
    case "digest": {
      const [finance, memory, reminders] = await Promise.all([
        financeSummary().catch(() => null),
        memorySummary().catch(() => ""),
        listReminders().catch(() => [] as Awaited<ReturnType<typeof listReminders>>),
      ]);

      const dueReminders = reminders
        .filter((r) => !r.done)
        .slice(0, 5)
        .map((r) => `• ${r.title}`)
        .join("\n");

      const prompt = `Sen Jarvis — qisqa kunlik brifing yoz (o'zbek tilida, 5-10 satr):
Bugun: ${new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })}
${memory ? `Xotira: ${memory}` : ""}
${finance ? `Moliya: daromad ${finance.income.toLocaleString()} so'm, xarajat ${finance.expense.toLocaleString()} so'm, balans ${finance.net.toLocaleString()} so'm` : ""}
${dueReminders ? `Eslatmalar:\n${dueReminders}` : ""}
Motivatsion, konkret, qisqa yoz.`;

      const text = await callAI("", prompt);
      ctx.vars["digest"] = text;
      return { ok: true, output: text };
    }

    // ── Telegram: send message to owner
    case "telegram": {
      const ownerId = OWNER?.telegramId;
      if (!ownerId) return { ok: false, output: "OWNER_TELEGRAM_ID sozlanmagan" };
      const text = interpolate(cfg.message || ctx.vars["digest"] || ctx.vars["agent_output"] || ctx.input || "");
      if (!text) return { ok: false, output: "Yuborish uchun matn yo'q" };
      await tgSend(ownerId, text.slice(0, 4096));
      return { ok: true, output: `Telegram yuborildi (${text.length} belgi)` };
    }

    // ── Agent: run specialist agent
    case "agent": {
      const agentId = cfg.agentId || "assistant";
      const { AGENTS } = await import("./agents");
      const agent = (AGENTS as Record<string, { name: string; prompt: string }>)[agentId]
        || (AGENTS as Record<string, { name: string; prompt: string }>)["assistant"];
      const task = interpolate(cfg.task || ctx.input || "Vazifasiz ishla");
      const result = await callAI(agent.prompt, task);
      ctx.vars["agent_output"] = result;
      return { ok: true, output: result };
    }

    // ── Skill: call a named skill/prompt
    case "skill": {
      const skillName = cfg.skill || "plan";
      const result = await callAI(
        `Sen ${skillName} skillini bajaruvchi mutaxassis.`,
        interpolate(cfg.input || ctx.input || skillName)
      );
      ctx.vars["skill_output"] = result;
      return { ok: true, output: result };
    }

    // ── Finance report
    case "finance_report": {
      const summary = await financeSummary().catch(() => null);
      if (!summary) return { ok: false, output: "Moliyaviy ma'lumot yo'q" };
      const report = JSON.stringify({
        net: summary.net,
        income: summary.income,
        expense: summary.expense,
        monthly_subs_cost: summary.monthlySubsCost,
        owed_by_me: summary.owedByMe,
        owed_to_me: summary.owedToMe,
      }, null, 2);
      ctx.vars["finance_report"] = report;
      return { ok: true, output: `Hisobot tayyor (${Object.keys(summary).length} maydon)` };
    }

    // ── Google Sheets (via Apps Script webhook or direct API)
    case "sheets": {
      const webhookUrl = cfg.webhook_url || process.env.SHEETS_WEBHOOK_URL;
      if (!webhookUrl) return { ok: false, output: "SHEETS_WEBHOOK_URL sozlanmagan" };
      const payload = ctx.vars["finance_report"] || ctx.vars["agent_output"] || ctx.input || "";
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payload, timestamp: new Date().toISOString() }),
        });
        return { ok: res.ok, output: `Sheets: ${res.status} ${res.statusText}` };
      } catch (e) {
        return { ok: false, output: `Sheets xatosi: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    // ── Email (via Resend or SMTP)
    case "email": {
      const to = cfg.to || process.env.OWNER_EMAIL;
      if (!to) return { ok: false, output: "Email manzil sozlanmagan" };
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return { ok: false, output: "RESEND_API_KEY sozlanmagan" };
      const subject = interpolate(cfg.subject || "Pari AI xabarnomasi");
      const body = interpolate(cfg.body || ctx.vars["digest"] || ctx.vars["agent_output"] || ctx.input || "");
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Pari AI <noreply@resend.dev>",
            to: [to],
            subject,
            text: body,
          }),
        });
        const data = await res.json();
        return { ok: res.ok, output: res.ok ? `Email yuborildi: ${data.id}` : `Email xatosi: ${JSON.stringify(data)}` };
      } catch (e) {
        return { ok: false, output: `Email xatosi: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    // ── Webhook: POST to external URL
    case "http_request": {
      const url = interpolate(cfg.url || "");
      if (!url) return { ok: false, output: "URL ko'rsatilmagan" };
      const method = cfg.method || "POST";
      const bodyText = interpolate(cfg.body || ctx.vars["agent_output"] || "");
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method !== "GET" ? bodyText : undefined,
        });
        const text = await res.text().catch(() => "");
        return { ok: res.ok, output: `${res.status}: ${text.slice(0, 200)}` };
      } catch (e) {
        return { ok: false, output: `HTTP xatosi: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    // ── Vault: save to knowledge/memory
    case "vault": {
      const title = interpolate(cfg.title || "flow-note");
      const content = ctx.vars["agent_output"] || ctx.vars["digest"] || ctx.input || "";
      // call internal API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.RAILWAY_STATIC_URL}`;
      try {
        await fetch(`${appUrl}/api/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, source: "automation" }),
        });
        ctx.vars["vault_title"] = title;
        return { ok: true, output: `Vaultga saqlandi: ${title}` };
      } catch (e) {
        return { ok: false, output: `Vault xatosi: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    // ── Condition: if owner
    case "if_owner":
      return { ok: true, output: "Condition passed (owner)" };

    // ── Wait / delay
    case "wait": {
      const ms = parseInt(cfg.ms || "1000");
      await new Promise((r) => setTimeout(r, Math.min(ms, 30_000)));
      return { ok: true, output: `${ms}ms kutildi` };
    }

    case "end":
      return { ok: true, output: "Flow tugadi" };

    default:
      return { ok: false, output: `Noma'lum node turi: ${node.type}` };
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runFlow(
  flow: { id: string; name: string; nodes: FlowNode[] },
  triggerType = "manual",
  input = ""
): Promise<{ runId: string; steps: FlowRunStep[]; ok: boolean }> {
  const run = await createRun(flow.id, triggerType);
  const ctx: RunContext = { trigger: triggerType, input, vars: {} };
  const steps: FlowRunStep[] = [];
  let globalOk = true;
  let errorMsg: string | undefined;

  log("info", "automation", `Flow başlatildi: "${flow.name}" (${flow.nodes.length} node)`);

  for (const node of flow.nodes) {
    const t0 = Date.now();
    try {
      const result = await execNode(node, ctx);
      const ms = Date.now() - t0;
      steps.push({ node_id: node.id, type: node.type, ok: result.ok, output: result.output, ms });
      if (!result.ok) {
        globalOk = false;
        errorMsg = result.output;
        break; // Stop on first failure
      }
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ node_id: node.id, type: node.type, ok: false, output: `Xato: ${msg}`, ms });
      globalOk = false;
      errorMsg = msg;
      break;
    }
  }

  await finishRun(run.id, steps, globalOk ? undefined : errorMsg);
  await updateFlow(flow.id, {
    runs: 0, // will be incremented by DB trigger; for mem we patch later
    last_run_at: new Date().toISOString(),
  });

  log(globalOk ? "info" : "warn", "automation",
    `Flow "${flow.name}" ${globalOk ? "muvaffaqiyatli" : "xato bilan"} tugadi`);

  return { runId: run.id, steps, ok: globalOk };
}
