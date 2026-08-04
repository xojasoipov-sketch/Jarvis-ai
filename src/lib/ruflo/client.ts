import { rufloAgents } from "./agents";

export type RufloTask = {
  task: string;
  context?: Record<string, unknown>;
};

/**
 * Ruflo orchestration bridge.
 * Keeps Jarvis core stable while enabling multi-agent routing.
 */
export async function runRuflo(input: RufloTask) {
  const hasNativeRuntime = Boolean(process.env.RUFLO_API_URL);

  if (hasNativeRuntime) {
    const response = await fetch(process.env.RUFLO_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.RUFLO_API_KEY
          ? { Authorization: `Bearer ${process.env.RUFLO_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(input),
    });

    return response.json();
  }

  return {
    status: "local-orchestrator",
    task: input.task,
    agents: rufloAgents,
    next: "Connect RUFLO_API_URL for native Ruflo runtime",
  };
}
