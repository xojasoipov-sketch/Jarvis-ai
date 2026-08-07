"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Send, Clock, Sparkles, RefreshCw,
  Radio, CheckCircle2, XCircle, AlertCircle, Copy,
  ExternalLink, ImagePlay, ChevronDown, ChevronUp,
} from "lucide-react";

type Channel = {
  id: string; chat_id: number; username: string; title: string; category: string; created_at: string;
};
type Post = {
  id: string; channel_id: string; content: string; image_url?: string;
  status: "draft" | "scheduled" | "sent" | "failed"; scheduled_at?: string;
  sent_at?: string; topic?: string; created_at: string;
};
type Stats = { total: number; sent: number; scheduled: number; draft: number; failed: number };

const STATUS_ICON: Record<Post["status"], React.ReactNode> = {
  draft: <AlertCircle size={13} className="text-amber-500" />,
  scheduled: <Clock size={13} className="text-blue-500" />,
  sent: <CheckCircle2 size={13} className="text-emerald-500" />,
  failed: <XCircle size={13} className="text-red-500" />,
};
const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Draft", scheduled: "Rejalashtirilgan", sent: "Yuborildi", failed: "Xato",
};

const CATEGORIES = ["general", "tech", "business", "lifestyle", "news", "education"];
const TONES = ["professional", "friendly", "casual", "motivational", "informative"];

export default function SmmPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "channels" | "generate" | "carousel">("posts");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // New channel form
  const [newChatId, setNewChatId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");

  // New post form
  const [postContent, setPostContent] = useState("");
  const [postChannel, setPostChannel] = useState("");
  const [postSchedule, setPostSchedule] = useState("");
  const [postTopic, setPostTopic] = useState("");
  const [sendingPost, setSendingPost] = useState(false);

  // AI generate
  const [genTopic, setGenTopic] = useState("");
  const [genCategory, setGenCategory] = useState("general");
  const [genTone, setGenTone] = useState("professional");
  const [genCount, setGenCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([]);

  // Carousel state
  type CarouselSlide = { heading: string; body: string };
  type CarouselResult = { slide: number; heading: string; body: string; id?: string; editUrl?: string; viewUrl?: string };
  const [carouselTitle, setCarouselTitle] = useState("");
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([
    { heading: "", body: "" },
    { heading: "", body: "" },
    { heading: "", body: "" },
  ]);
  const [carouselResults, setCarouselResults] = useState<CarouselResult[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [carouselError, setCarouselError] = useState("");
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chRes, postRes, statRes] = await Promise.all([
        fetch("/api/smm/channels"),
        fetch(`/api/smm/posts${selectedChannel !== "all" ? `?channel_id=${selectedChannel}` : ""}`),
        fetch(`/api/smm/stats${selectedChannel !== "all" ? `?channel_id=${selectedChannel}` : ""}`),
      ]);
      const chData = await chRes.json();
      const postData = await postRes.json();
      const statData = await statRes.json();
      setChannels(chData.channels || []);
      setPosts(postData.posts || []);
      setStats(statData.stats || null);
    } catch {
      // silently ignore network errors on load
    } finally {
      setLoading(false);
    }
  }, [selectedChannel]);

  useEffect(() => { load(); }, [load]);

  async function addChannel() {
    if (!newChatId || !newTitle) return;
    setAddingChannel(true);
    setChannelError("");
    const res = await fetch("/api/smm/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: Number(newChatId), username: newUsername, title: newTitle, category: newCategory }),
    });
    const data = await res.json();
    if (!res.ok) {
      setChannelError(data.error || "Xato");
    } else {
      setNewChatId(""); setNewUsername(""); setNewTitle(""); setNewCategory("general");
      load();
    }
    setAddingChannel(false);
  }

  async function removeChannel(id: string) {
    await fetch(`/api/smm/channels?id=${id}`, { method: "DELETE" });
    load();
  }

  async function publishNow(postId: string) {
    setSendingPost(true);
    await fetch("/api/smm/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });
    setSendingPost(false);
    load();
  }

  async function createPost(content: string, channelId: string, scheduled?: string, topic?: string) {
    const res = await fetch("/api/smm/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: channelId,
        content,
        scheduled_at: scheduled || undefined,
        topic,
        status: scheduled ? "scheduled" : "draft",
      }),
    });
    return res.json();
  }

  async function saveAndPublish() {
    if (!postContent || !postChannel) return;
    setSendingPost(true);
    const { post } = await createPost(postContent, postChannel, postSchedule, postTopic);
    if (post && !postSchedule) {
      await publishNow(post.id);
    }
    setPostContent(""); setPostSchedule(""); setPostTopic("");
    setSendingPost(false);
    load();
  }

  async function deletePost(id: string) {
    await fetch(`/api/smm/posts?id=${id}`, { method: "DELETE" });
    load();
  }

  async function generatePosts() {
    if (!genTopic) return;
    setGenerating(true);
    setGeneratedPosts([]);
    const res = await fetch("/api/smm/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: genTopic, channel_category: genCategory, tone: genTone, count: genCount }),
    });
    const data = await res.json();
    setGeneratedPosts(data.posts || []);
    setGenerating(false);
  }

  async function useGenerated(content: string) {
    setPostContent(content);
    setActiveTab("posts");
    if (channels.length === 1) setPostChannel(channels[0].id);
  }

  const channelMap = Object.fromEntries(channels.map((c) => [c.id, c]));

  function updateSlide(idx: number, field: "heading" | "body", value: string) {
    setCarouselSlides((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }
  function addSlide() {
    setCarouselSlides((prev) => [...prev, { heading: "", body: "" }]);
  }
  function removeSlide(idx: number) {
    if (carouselSlides.length <= 1) return;
    setCarouselSlides((prev) => prev.filter((_, i) => i !== idx));
  }

  async function createCarousel() {
    if (!carouselTitle || carouselSlides.some((s) => !s.heading)) return;
    setCarouselLoading(true);
    setCarouselError("");
    setCarouselResults([]);
    const res = await fetch("/api/smm/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: carouselTitle, slides: carouselSlides }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCarouselError(data.error || "Xato yuz berdi");
    } else {
      setCarouselResults(data.slides || []);
    }
    setCarouselLoading(false);
  }

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SMM Boshqaruvi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Telegram kanal postlarini boshqarish va AI bilan yaratish</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={15} strokeWidth={1.75} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Jami", value: stats.total, color: "text-gray-700" },
            { label: "Yuborilgan", value: stats.sent, color: "text-emerald-600" },
            { label: "Rejalashtirilgan", value: stats.scheduled, color: "text-blue-600" },
            { label: "Draft", value: stats.draft, color: "text-amber-600" },
            { label: "Xato", value: stats.failed, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {(["posts", "channels", "generate", "carousel"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "posts" ? "Postlar"
              : tab === "channels" ? "Kanallar"
              : tab === "generate" ? "AI Yaratish"
              : "Instagram Karusel"}
          </button>
        ))}
      </div>

      {/* ──── POSTS TAB ──── */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {/* New post form */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Yangi post</h2>
            {channels.length === 0 ? (
              <p className="text-sm text-gray-400">Avval kanal qo'shing (Kanallar bo'limi).</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={postChannel}
                  onChange={(e) => setPostChannel(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Kanal tanlang</option>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Post matnini yozing..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
                <div className="flex gap-2">
                  <input
                    value={postTopic}
                    onChange={(e) => setPostTopic(e.target.value)}
                    placeholder="Mavzu tegi (ixtiyoriy)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="datetime-local"
                    value={postSchedule}
                    onChange={(e) => setPostSchedule(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveAndPublish}
                    disabled={!postContent || !postChannel || sendingPost}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <Send size={13} strokeWidth={2} />
                    {postSchedule ? "Rejalashtirish" : "Hozir yuborish"}
                  </button>
                  <button
                    onClick={() => { setSendingPost(true); createPost(postContent, postChannel, undefined, postTopic).then(() => { setPostContent(""); load(); setSendingPost(false); }); }}
                    disabled={!postContent || !postChannel || sendingPost}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    Draft saqlash
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Channel filter */}
          {channels.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedChannel("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedChannel === "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                Hammasi
              </button>
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChannel(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedChannel === c.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}

          {/* Posts list */}
          <div className="space-y-3">
            {posts.length === 0 && !loading && (
              <p className="text-sm text-gray-400 text-center py-8">Hali post yo'q.</p>
            )}
            {posts.map((post) => (
              <div key={post.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {STATUS_ICON[post.status]}
                        {STATUS_LABEL[post.status]}
                      </span>
                      {channelMap[post.channel_id] && (
                        <span className="flex items-center gap-1 text-xs text-indigo-600">
                          <Radio size={11} strokeWidth={1.75} />
                          {channelMap[post.channel_id].title}
                        </span>
                      )}
                      {post.topic && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded-full">{post.topic}</span>
                      )}
                      {post.scheduled_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(post.scheduled_at).toLocaleString("uz-UZ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.content}</p>
                    <p className="text-xs text-gray-300 mt-1.5">{new Date(post.created_at).toLocaleDateString("uz-UZ")}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => navigator.clipboard?.writeText(post.content)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Nusxalash"
                    >
                      <Copy size={14} strokeWidth={1.75} />
                    </button>
                    {(post.status === "draft" || post.status === "failed") && (
                      <button
                        onClick={() => publishNow(post.id)}
                        disabled={sendingPost}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                        title="Hozir yuborish"
                      >
                        <Send size={14} strokeWidth={1.75} />
                      </button>
                    )}
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── CHANNELS TAB ──── */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Kanal ulash</h2>
            <p className="text-xs text-gray-400 mb-4">
              Botingizni kanalga admin qiling, keyin quyidagi ma'lumotlarni to'ldiring.
              Chat ID ni bilish uchun kanalga /getid yuboring yoki @username_to_id_bot dan foydalaning.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                placeholder="Chat ID (masalan: -1001234567890)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username (ixtiyoriy)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Kanal nomi"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {channelError && <p className="text-xs text-red-500 mt-2">{channelError}</p>}
            <button
              onClick={addChannel}
              disabled={addingChannel || !newChatId || !newTitle}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Plus size={14} strokeWidth={2} />
              {addingChannel ? "Ulanmoqda..." : "Kanal qo'shish"}
            </button>
          </div>

          <div className="space-y-3">
            {channels.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Hali ulangan kanal yo'q.</p>
            )}
            {channels.map((ch) => (
              <div key={ch.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Radio size={16} strokeWidth={1.75} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ch.title}</p>
                  <p className="text-xs text-gray-400">{ch.username ? `@${ch.username} · ` : ""}{ch.category} · ID: {ch.chat_id}</p>
                </div>
                <button
                  onClick={() => removeChannel(ch.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── CAROUSEL TAB ──── */}
      {activeTab === "carousel" && (
        <div className="space-y-5">
          {/* Header info */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <ImagePlay size={18} className="text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-orange-800">Canva orqali Instagram karusel</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Har bir slide uchun sarlavha va matn kiriting. Canva da 1080×1080 design yaratiladi va tahrirlash havolasi beriladi.
                CANVA_ACCESS_TOKEN ni .env ga qo'shing.
              </p>
            </div>
          </div>

          {/* Carousel builder */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Karusel sarlavhasi (Canva da ko'rinadi)</label>
              <input
                value={carouselTitle}
                onChange={(e) => setCarouselTitle(e.target.value)}
                placeholder="Masalan: Startap uchun 5 ta maslahat"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* Slides */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{carouselSlides.length} ta slide</p>
                <button
                  onClick={addSlide}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  <Plus size={12} strokeWidth={2.5} /> Slide qo'shish
                </button>
              </div>

              {carouselSlides.map((slide, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSlide(expandedSlide === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-600">
                      Slide {idx + 1}{slide.heading ? ` — ${slide.heading.slice(0, 40)}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      {carouselSlides.length > 1 && (
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                          className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                        >
                          <Trash2 size={12} strokeWidth={1.75} />
                        </span>
                      )}
                      {expandedSlide === idx
                        ? <ChevronUp size={13} className="text-gray-400" />
                        : <ChevronDown size={13} className="text-gray-400" />}
                    </div>
                  </button>

                  {(expandedSlide === idx || expandedSlide === null) && (
                    <div className="p-4 space-y-2.5">
                      <input
                        value={slide.heading}
                        onChange={(e) => updateSlide(idx, "heading", e.target.value)}
                        placeholder={`Slide ${idx + 1} sarlavhasi *`}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                      <textarea
                        value={slide.body}
                        onChange={(e) => updateSlide(idx, "body", e.target.value)}
                        placeholder="Slide matni (ixtiyoriy)"
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {carouselError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{carouselError}</p>
            )}

            <button
              onClick={createCarousel}
              disabled={carouselLoading || !carouselTitle || carouselSlides.some((s) => !s.heading)}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
            >
              <ImagePlay size={15} strokeWidth={2} className={carouselLoading ? "animate-pulse" : ""} />
              {carouselLoading ? `Canva da yaratyapman (${carouselSlides.length} slide)...` : "Canva da yaratish"}
            </button>
          </div>

          {/* Results */}
          {carouselResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500">{carouselResults.length} ta design yaratildi — Canva da tahrirlang:</p>
              {carouselResults.map((r) => (
                <div key={r.slide} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-500">{r.slide}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.heading}</p>
                    {r.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.body}</p>}
                    <div className="flex gap-2 mt-2.5">
                      {r.editUrl && (
                        <a
                          href={r.editUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <ExternalLink size={11} strokeWidth={2} />
                          Canva da tahrirlash
                        </a>
                      )}
                      {r.viewUrl && (
                        <a
                          href={r.viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg transition-colors"
                        >
                          <ExternalLink size={11} strokeWidth={2} />
                          Ko'rish
                        </a>
                      )}
                      {!r.editUrl && !r.id && (
                        <span className="text-xs text-gray-400 italic">Design yaratildi (CANVA_ACCESS_TOKEN token kerak)</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center pt-1">
                Har bir linkni ochib, Canva da matn/rang/rasm qo'shing, keyin PNG sifatida yuklab oling.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ──── GENERATE TAB ──── */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">AI bilan post yaratish</h2>
            <div className="space-y-3">
              <input
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Mavzu (masalan: Next.js 15 yangiliklari, Startap maslahatlar...)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={genTone}
                  onChange={(e) => setGenTone(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} ta post</option>)}
                </select>
              </div>
              <button
                onClick={generatePosts}
                disabled={generating || !genTopic}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                <Sparkles size={14} strokeWidth={2} className={generating ? "animate-pulse" : ""} />
                {generating ? "Yaratyapman..." : "Yaratish"}
              </button>
            </div>
          </div>

          {generatedPosts.length > 0 && (
            <div className="space-y-3">
              {generatedPosts.map((p, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-400 mb-2">Variant {i + 1}</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{p}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => useGenerated(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Send size={12} strokeWidth={2} />
                      Postlar bo'limiga o'tkazish
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Copy size={12} strokeWidth={2} />
                      Nusxalash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
