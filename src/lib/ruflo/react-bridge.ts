import { shouldUseRuflo, runRufloRoute } from "./router";

/**
 * Safe bridge between existing ReAct agent and Ruflo.
 * ReAct remains the fallback; Ruflo handles complex orchestration tasks.
 */
export async function tryRufloBeforeReact(task: string) {
  if (!task || !(await shouldUseRuflo(task))) {
    return null;
  }

  try {
    return await runRufloRoute(task);
  } catch {
    // Never break Jarvis ReAct flow if Ruflo is unavailable.
    return null;
  }
}
