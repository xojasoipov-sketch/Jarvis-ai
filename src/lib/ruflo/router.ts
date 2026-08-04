import { runRuflo } from "./client";

/**
 * Decides when Jarvis should use Ruflo orchestration.
 * Existing ReAct flow stays untouched.
 */
export async function shouldUseRuflo(task: string) {
  return /build|create|develop|plan|research|analyze|automate|code|project|architecture|deploy/i.test(task);
}

export async function runRufloRoute(task: string) {
  return runRuflo({
    task,
    context: {
      source: "jarvis-router",
      mode: "orchestrated",
    },
  });
}
