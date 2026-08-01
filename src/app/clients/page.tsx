"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Search, MessageSquare, CheckSquare, Phone, Mail, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

type Client = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  notes?: string;
  created_at: string;
  total_orders?: number;
  total_paid?: number;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", website: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addClient() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (d.client) { setClients(prev => [d.client, ...prev]); setForm({ name: "", email: "", phone: "", company: "", website: "", notes: "" }); setShowAdd(false); }
    } finally { setSaving(false); }
  }

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mijozlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">CRM — barcha mijozlar va loyihalar</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Mijoz qo'sh
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Yangi mijoz</p>
          <div className="grid grid-cols-2 gap-3">
            {["name", "company", "email", "phone", "website"].map((key) => (
              <input key={key} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={key === "name" ? "Ism *" : key.charAt(0).toUpperCase() + key.slice(1)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900" />
            ))}
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Izoh" rows={2}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={addClient} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50">{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500">Bekor</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[{"label": "Jami mijozlar", "value": clients.length},
          {"label": "Faol loyihalar", "value": clients.filter(c => (c.total_orders || 0) > 0).length},
          {"label": "Jami to'langan", "value": clients.reduce((s, c) => s + (c.total_paid || 0), 0) ? `$${clients.reduce((s,c)=>s+(c.total_paid||0),0).toLocaleString()}` : "—"},
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ism, kompaniya, email..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "Mijoz topilmadi" : "Hali mijoz yo'q. Birinchi mijozni qo'shing."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    {c.company && <span className="text-xs text-gray-400">{c.company}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {c.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={11} />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={11} />{c.phone}</span>}
                    {c.website && <span className="flex items-center gap-1 text-xs text-gray-400"><Globe size={11} />{c.website}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{c.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => router.push(`/chat?q=${encodeURIComponent(`Mijoz ${c.name} bilan ishlayapmiz.`)}`)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Chat"><MessageSquare size={14} /></button>
                  <button onClick={() => router.push(`/orders?client=${c.id}`)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Buyurtmalar"><CheckSquare size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
