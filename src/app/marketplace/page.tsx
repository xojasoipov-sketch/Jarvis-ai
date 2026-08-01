"use client";
import { useState, useEffect, useCallback } from "react";
import { Store, Bot, Zap, FileText, Cpu, Star, Search, Plus, X, Download, ExternalLink, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

type Item = { id: number; title: string; description: string; category: string; price: number; price_display: string; price_free: boolean; seller_name: string; demo_url?: string; tags: string[]; downloads: number; rating: number; created_at: string };

const CATEGORIES = [
  { id: "all", label: "Barchasi", icon: Store },
  { id: "agents", label: "AI Agentlar", icon: Bot },
  { id: "automation", label: "Avtomatizatsiya", icon: Zap },
  { id: "prompts", label: "Promptlar", icon: FileText },
  { id: "templates", label: "Shablonlar", icon: Cpu },
];

const EMPTY_FORM = { title: "", description: "", category: "automation", price_display: "", price_free: false, demo_url: "", tags: "" };

export default function MarketplacePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search) params.set("q", search);
    fetch(`/api/marketplace?${params}`).then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [category, search]);

  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) }) });
      const d = await res.json();
      if (d.item) { setItems(prev => [d.item, ...prev]); setForm(EMPTY_FORM); setShowAdd(false); }
    } finally { setSaving(false); }
  }

  function getCategory(id: string) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI agentlar, avtomatizatsiya va shablonlar bozori</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"><Plus size={14} /> Mahsulot qo'sh</button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Yangi mahsulot</p>
            <button onClick={() => setShowAdd(false)}><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Mahsulot nomi *" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
              <option value="agents">AI Agentlar</option><option value="automation">Avtomatizatsiya</option><option value="prompts">Promptlar</option><option value="templates">Shablonlar</option>
            </select>
            <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Tavsif *" rows={2} className="px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none col-span-2" />
            <input value={form.price_display} onChange={e => setForm(p=>({...p,price_display:e.target.value}))} placeholder="Narx ($19 yoki Bepul)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <input value={form.demo_url} onChange={e => setForm(p=>({...p,demo_url:e.target.value}))} placeholder="Demo URL" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <input value={form.tags} onChange={e => setForm(p=>({...p,tags:e.target.value}))} placeholder="Teglar: telegram, n8n" className="px-3 py-2 text-sm border border-gray-200 rounded-lg col-span-2" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.price_free} onChange={e => setForm(p=>({...p,price_free:e.target.checked}))} /> Bepul</label>
            <button onClick={addItem} disabled={saving || !form.title.trim() || !form.description.trim()} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg disabled:opacity-50">{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{"label": "Jami", "value": items.length}, {"label": "Bepul", "value": items.filter(i => i.price_free).length}, {"label": "Pullik", "value": items.filter(i => !i.price_free).length}, {"label": "Yuklab olishlar", "value": items.reduce((s,i) => s+(i.downloads||0), 0)}].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400">{s.label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p></div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-56" /></div>
        <div className="flex gap-1 flex-wrap">{CATEGORIES.map(c => { const Icon = c.icon; return (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${category === c.id ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}><Icon size={12} />{c.label}</button>
        ); })}</div>
      </div>

      {loading ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      : items.length === 0 ? <div className="text-center py-16 text-gray-400"><Store size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Mahsulot topilmadi</p></div>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(item => {
            const cat = getCategory(item.category); const CatIcon = cat.icon;
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400"><CatIcon size={11} />{cat.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.price_free ? "bg-green-50 text-green-600" : "bg-gray-900 text-white"}`}>{item.price_display || (item.price_free ? "Bepul" : `$${item.price}`)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400 mt-1.5 flex-1 line-clamp-2">{item.description}</p>
                {item.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{item.tags.slice(0,3).map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md">{tag}</span>)}</div>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-0.5 text-xs text-gray-400"><Star size={10} className="text-yellow-400 fill-yellow-400" />{item.rating}</span>
                  <div className="flex items-center gap-1">
                    {item.demo_url && <a href={item.demo_url} target="_blank" rel="noopener" className="p-1.5 text-gray-400 hover:text-gray-700"><ExternalLink size={13} /></a>}
                    <button onClick={() => router.push(`/chat?q=${encodeURIComponent(`"${item.title}" mahsulotini olmoqchiman`)}`)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg"><MessageSquare size={11} />{item.price_free ? "Yuklab olish" : "So'rash"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
