/** Visual automation flows — n8n-inspired sequential graph (local model) */

export type NodeKind = "trigger" | "action" | "condition" | "output";

export type FlowNode = {
  id: string;
  kind: NodeKind;
  type: string; // schedule | keyword | manual | skill | agent | notify | vault | digest
  label: string;
  config: Record<string, string>;
};

export type VisualFlow = {
  id: string;
  name: string;
  active: boolean;
  nodes: FlowNode[]; // ordered = sequential edges
  runs: number;
  lastRun?: string;
};

export const NODE_CATALOG: {
  kind: NodeKind;
  type: string;
  label: string;
  labelUz: string;
  defaults?: Record<string, string>;
}[] = [
  { kind: "trigger", type: "manual", label: "Manual", labelUz: "Qo'lda", defaults: {} },
  { kind: "trigger", type: "schedule", label: "Schedule", labelUz: "Jadval", defaults: { cron: "09:00" } },
  { kind: "trigger", type: "keyword", label: "Keyword", labelUz: "Kalit so'z", defaults: { keyword: "" } },
  { kind: "action", type: "skill", label: "Skill", labelUz: "Skill", defaults: { skill: "plan" } },
  { kind: "action", type: "agent", label: "Agent", labelUz: "Agent", defaults: { agentId: "assistant" } },
  { kind: "action", type: "digest", label: "Digest", labelUz: "Brifing", defaults: {} },
  { kind: "action", type: "vault", label: "Save vault", labelUz: "Vaultga yoz", defaults: { title: "flow-note" } },
  { kind: "action", type: "notify", label: "Notify", labelUz: "Bildirish", defaults: { channel: "ui" } },
  { kind: "condition", type: "if_owner", label: "If owner", labelUz: "Faqat egasi", defaults: {} },
  { kind: "output", type: "end", label: "End", labelUz: "Tugash", defaults: {} },
];

export function seedFlows(): VisualFlow[] {
  return [
    {
      id: "flow-morning",
      name: "Kunlik brifing",
      active: true,
      runs: 0,
      nodes: [
        { id: "n1", kind: "trigger", type: "schedule", label: "Har kuni 09:00", config: { cron: "09:00" } },
        { id: "n2", kind: "action", type: "digest", label: "Morning digest", config: {} },
        { id: "n3", kind: "action", type: "vault", label: "Vaultga yoz", config: { title: "daily-brief" } },
        { id: "n4", kind: "output", type: "end", label: "End", config: {} },
      ],
    },
    {
      id: "flow-plan",
      name: "Reja pipeline",
      active: true,
      runs: 0,
      nodes: [
        { id: "n1", kind: "trigger", type: "manual", label: "Manual start", config: {} },
        { id: "n2", kind: "action", type: "skill", label: "Skill: plan", config: { skill: "plan" } },
        { id: "n3", kind: "action", type: "notify", label: "UI notify", config: { channel: "ui" } },
        { id: "n4", kind: "output", type: "end", label: "End", config: {} },
      ],
    },
    {
      id: "flow-keyword",
      name: "Yangi loyiha → CEO",
      active: false,
      runs: 0,
      nodes: [
        { id: "n1", kind: "trigger", type: "keyword", label: "Kalit: yangi loyiha", config: { keyword: "yangi loyiha" } },
        { id: "n2", kind: "condition", type: "if_owner", label: "Faqat egasi", config: {} },
        { id: "n3", kind: "action", type: "agent", label: "CEO agent", config: { agentId: "ceo" } },
        { id: "n4", kind: "output", type: "end", label: "End", config: {} },
      ],
    },
  ];
}

export function kindColor(kind: NodeKind): string {
  switch (kind) {
    case "trigger":
      return "#6366f1"; // indigo
    case "action":
      return "#0d9488"; // teal
    case "condition":
      return "#d97706"; // amber
    case "output":
      return "#64748b"; // slate
  }
}
