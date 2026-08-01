"use client";
import { useState } from "react";
import {
  Image, Video, Mic, User, Music, Subtitles, Scissors, Maximize2, Languages,
  Upload, Wand2, Play, Download, type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Tool = {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  badge?: string;
  chatPrompt: string;
};

const TOOLS: Tool[] = [
  {
    id: "image",
    label: "AI Rasm",
    desc: "Matn orqali rasm yarating",
    icon: Image,
    chatPrompt: "AI rasm yaratish kerak. Tasvirlab bering — qanday rasm bo'lishi kerak?",
  },
  {
    id: "video-edit",
    label: "Video tahrirlash",
    desc: "Video skript va tahrirga yordam",
    icon: Video,
    chatPrompt: "Video tahrirlash kerak. Videoni maqsadi va ko'rinishi haqida aytib bering.",
  },
  {
    id: "voice",
    label: "Ovoz (TTS)",
    desc: "Matnni ovozga aylantiring",
    icon: Mic,
    badge: "Beta",
    chatPrompt: "Matnni ovozga aylantirish kerak. Qanday matn va qaysi tilda?",
  },
  {
    id: "avatar",
    label: "AI Avatar",
    desc: "AI avatar video yarating",
    icon: User,
    badge: "Soon",
    chatPrompt: "AI avatar video kerak. Skriptni va avatar ko'rinishini tasvirlab bering.",
  },
  {
    id: "music",
    label: "Musiqa",
    desc: "AI musiqa yarating",
    icon: Music,
    badge: "Soon",
    chatPrompt: "Musiqa yaratish kerak. Janr, kayfiyat va davomiyligini aytib bering.",
  },
  {
    id: "subtitle",
    label: "Subtitrlar",
    desc: "Video uchun subtitr yarating",
    icon: Subtitles,
    chatPrompt: "Video uchun subtitr kerak. Matnni yozing yoki audio URL bering.",
  },
  {
    id: "cut",
    label: "Video qisqartirish",
    desc: "Uzun videoni qisqa kliplarga",
    icon: Scissors,
    chatPrompt: "Videoni qisqartirish va qismlarga bo'lish kerak. Qanday video va maqsadi nima?",
  },
  {
    id: "upscale",
    label: "Sifat oshirish",
    desc: "Rasm/video sifatini oshiring",
    icon: Maximize2,
    badge: "Soon",
    chatPrompt: "Rasm yoki video sifatini oshirish kerak. Fayl linkini yuboring.",
  },
  {
    id: "translate",
    label: "Tarjima",
    desc: "Video/audio tarjima qiling",
    icon: Languages,
    chatPrompt: "Audio yoki video tarjima kerak. Manba va maqsad tilni ayting.",
  },
];

export default function MediaPage() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  function openTool(t: Tool) {
    router.push(`/chat?q=${encodeURIComponent(t.chatPrompt)}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Media Studio</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI bilan kontent yarating — rasm, video, ovoz, avatar</p>
      </div>

      {/* Quick action */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-sm font-semibold mb-1">Nima yaratmoqchisiz?</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {["Reklama video skripti", "SMM uchun rasm", "Telegram kanal audio", "YouTube intro skript", "Brend video konsept"].map(p => (
            <button
              key={p}
              onClick={() => router.push(`/chat?q=${encodeURIComponent(p)}`)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded-lg transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map(t => {
          const Icon = t.icon;
          const isSoon = t.badge === "Soon";
          return (
            <button
              key={t.id}
              onClick={() => !isSoon && openTool(t)}
              disabled={isSoon}
              className={`bg-white border rounded-xl p-4 text-left transition-all ${
                isSoon
                  ? "border-gray-100 opacity-60 cursor-not-allowed"
                  : "border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon size={18} className="text-gray-700" />
                </div>
                {t.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    t.badge === "Soon" ? "bg-gray-100 text-gray-500" : "bg-orange-100 text-orange-600"
                  }`}>
                    {t.badge}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Recent media - placeholder */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">So'nggi yaratilganlar</p>
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400">
          <Video size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Hali media fayl yaratilmagan</p>
          <p className="text-xs mt-1">Yuqoridagi asboblardan birini tanlang</p>
        </div>
      </div>
    </div>
  );
}
