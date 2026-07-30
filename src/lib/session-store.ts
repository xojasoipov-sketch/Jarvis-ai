// In-memory session store (production'da Redis yoki DB ishlatiladi)
type Session = {
  mode: "chat" | "agent" | "smm_post" | "smm_generated";
  agentId?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  waitingFor?: "agent_task";
  // SMM state
  smmChannelId?: string;
  smmContent?: string;
  smmDrafts?: string[];
};

const sessions = new Map<number, Session>();

export function getSession(chatId: number): Session {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { mode: "chat", history: [] });
  }
  return sessions.get(chatId)!;
}

export function updateSession(chatId: number, update: Partial<Session>) {
  const s = getSession(chatId);
  sessions.set(chatId, { ...s, ...update });
}

export function addToHistory(chatId: number, role: "user" | "assistant", content: string) {
  const s = getSession(chatId);
  s.history.push({ role, content });
  // Oxirgi 20 ta xabarni saqlash
  if (s.history.length > 20) s.history = s.history.slice(-20);
  sessions.set(chatId, s);
}

export function clearHistory(chatId: number) {
  const s = getSession(chatId);
  s.history = [];
  sessions.set(chatId, s);
}
