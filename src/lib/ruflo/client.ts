export type RufloTask = {
  task: string;
  context?: Record<string, unknown>;
};

/**
 * Ruflo bridge layer.
 * Keeps orchestration isolated from existing Jarvis agents.
 */
export async function runRuflo(task: RufloTask) {
  return {
    status: "ready",
    task: task.task,
    agents: ["planner", "memory", "tool"],
    note: "Ruflo bridge initialized. Connect native Ruflo runtime here.",
  };
}
