import { NextRequest, NextResponse } from "next/server";
import { getChannel, updatePost, listPosts } from "@/lib/smm-store";
import { sendMessage } from "@/lib/telegram";

// POST /api/smm/publish  { post_id }
// Sends a draft or scheduled post to the Telegram channel immediately
export async function POST(req: NextRequest) {
  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "post_id kerak" }, { status: 400 });

  const posts = await listPosts();
  const post = posts.find((p) => p.id === post_id);
  if (!post) return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });

  const channel = await getChannel(post.channel_id);
  if (!channel) return NextResponse.json({ error: "Kanal topilmadi" }, { status: 404 });

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN yo'q");

    let tgMessageId: number | undefined;

    if (post.image_url) {
      // Send photo with caption
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.chat_id,
          photo: post.image_url,
          caption: post.content,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      tgMessageId = data?.result?.message_id;
    } else {
      // Text-only post — use HTML parse mode for Telegram formatting
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.chat_id,
          text: post.content,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Telegram xato");
      tgMessageId = data?.result?.message_id;
    }

    await updatePost(post.id, {
      status: "sent",
      sent_at: new Date().toISOString(),
      tg_message_id: tgMessageId,
    });

    return NextResponse.json({ ok: true, tg_message_id: tgMessageId });
  } catch (e) {
    await updatePost(post.id, { status: "failed" });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/smm/schedule/run — called by cron or manual trigger
// Sends all due scheduled posts
export async function PUT() {
  const { getDuePosts } = await import("@/lib/smm-store");
  const due = await getDuePosts();
  const results = [];

  for (const post of due) {
    const channel = await getChannel(post.channel_id);
    if (!channel) {
      await updatePost(post.id, { status: "failed" });
      results.push({ id: post.id, ok: false, error: "Kanal topilmadi" });
      continue;
    }
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.chat_id,
          text: post.content,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description);
      await updatePost(post.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        tg_message_id: data.result?.message_id,
      });
      results.push({ id: post.id, ok: true });
    } catch (e) {
      await updatePost(post.id, { status: "failed" });
      results.push({ id: post.id, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ sent: results.filter((r) => r.ok).length, results });
}
