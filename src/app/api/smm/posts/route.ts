import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost, updatePost, deletePost } from "@/lib/smm-store";

// GET /api/smm/posts?channel_id=...
export async function GET(req: NextRequest) {
  const channelId = new URL(req.url).searchParams.get("channel_id") || undefined;
  const posts = await listPosts(channelId);
  return NextResponse.json({ posts });
}

// POST /api/smm/posts  { channel_id, content, image_url?, scheduled_at?, topic? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { channel_id, content, image_url, scheduled_at, topic } = body;
  if (!channel_id || !content) {
    return NextResponse.json({ error: "channel_id va content kerak" }, { status: 400 });
  }
  const post = await createPost({
    channel_id,
    content,
    image_url,
    topic,
    status: scheduled_at ? "scheduled" : "draft",
    scheduled_at,
  });
  return NextResponse.json({ post });
}

// PATCH /api/smm/posts  { id, ...patch }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await updatePost(id, patch);
  return NextResponse.json({ ok: true });
}

// DELETE /api/smm/posts?id=...
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deletePost(id);
  return NextResponse.json({ ok: true });
}
