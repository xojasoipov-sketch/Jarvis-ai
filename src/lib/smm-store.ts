// SMM Store — channels, posts, schedule (in-memory + Supabase fallback)
import { supabase, dbConfigured } from "./supabase";
import { log } from "./logger";

export type SmmChannel = {
  id: string;
  chat_id: number;        // Telegram channel chat_id (negative)
  username: string;       // @handle
  title: string;
  category: string;       // tech / business / lifestyle ...
  created_at: string;
};

export type PostStatus = "draft" | "scheduled" | "sent" | "failed";

export type SmmPost = {
  id: string;
  channel_id: string;
  content: string;
  image_url?: string;
  status: PostStatus;
  scheduled_at?: string;  // ISO
  sent_at?: string;
  tg_message_id?: number;
  topic?: string;         // AI-generated topic tag
  created_at: string;
};

// ──────────────────────────────────────────────
// In-memory fallback (when Supabase not configured)
// ──────────────────────────────────────────────
const memChannels: SmmChannel[] = [];
const memPosts: SmmPost[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ──────────────────────────────────────────────
// Channels
// ──────────────────────────────────────────────
export async function listChannels(): Promise<SmmChannel[]> {
  if (dbConfigured && supabase) {
    const { data, error } = await supabase
      .from("pari_smm_channels")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) log("error", "smm", `listChannels: ${error.message}`);
    return data || [];
  }
  return [...memChannels];
}

export async function addChannel(ch: Omit<SmmChannel, "id" | "created_at">): Promise<SmmChannel> {
  const row: SmmChannel = { ...ch, id: uid(), created_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_smm_channels").insert(row).select().single();
    if (error) log("error", "smm", `addChannel: ${error.message}`);
    return data || row;
  }
  memChannels.unshift(row);
  return row;
}

export async function getChannel(id: string): Promise<SmmChannel | null> {
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_smm_channels").select("*").eq("id", id).single();
    if (error) log("error", "smm", `getChannel: ${error.message}`);
    return data || null;
  }
  return memChannels.find((c) => c.id === id) || null;
}

export async function deleteChannel(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_smm_channels").delete().eq("id", id);
    if (error) log("error", "smm", `deleteChannel: ${error.message}`);
    return;
  }
  const i = memChannels.findIndex((c) => c.id === id);
  if (i !== -1) memChannels.splice(i, 1);
}

// ──────────────────────────────────────────────
// Posts
// ──────────────────────────────────────────────
export async function listPosts(channelId?: string): Promise<SmmPost[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_smm_posts").select("*").order("created_at", { ascending: false });
    if (channelId) q = q.eq("channel_id", channelId);
    const { data, error } = await q;
    if (error) log("error", "smm", `listPosts: ${error.message}`);
    return data || [];
  }
  const posts = channelId ? memPosts.filter((p) => p.channel_id === channelId) : [...memPosts];
  return posts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createPost(p: Omit<SmmPost, "id" | "created_at">): Promise<SmmPost> {
  const row: SmmPost = { ...p, id: uid(), created_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_smm_posts").insert(row).select().single();
    if (error) log("error", "smm", `createPost: ${error.message}`);
    return data || row;
  }
  memPosts.unshift(row);
  return row;
}

export async function updatePost(id: string, patch: Partial<SmmPost>): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_smm_posts").update(patch).eq("id", id);
    if (error) log("error", "smm", `updatePost: ${error.message}`);
    return;
  }
  const i = memPosts.findIndex((p) => p.id === id);
  if (i !== -1) Object.assign(memPosts[i], patch);
}

export async function deletePost(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_smm_posts").delete().eq("id", id);
    if (error) log("error", "smm", `deletePost: ${error.message}`);
    return;
  }
  const i = memPosts.findIndex((p) => p.id === id);
  if (i !== -1) memPosts.splice(i, 1);
}

// Posts due to send now (scheduled_at <= now and status=scheduled)
export async function getDuePosts(): Promise<SmmPost[]> {
  const now = new Date().toISOString();
  if (dbConfigured && supabase) {
    const { data, error } = await supabase
      .from("pari_smm_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);
    if (error) log("error", "smm", `getDuePosts: ${error.message}`);
    return data || [];
  }
  return memPosts.filter(
    (p) => p.status === "scheduled" && p.scheduled_at && p.scheduled_at <= now
  );
}

// Simple stats
export async function getStats(channelId?: string) {
  const posts = await listPosts(channelId);
  return {
    total: posts.length,
    sent: posts.filter((p) => p.status === "sent").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    draft: posts.filter((p) => p.status === "draft").length,
    failed: posts.filter((p) => p.status === "failed").length,
  };
}
