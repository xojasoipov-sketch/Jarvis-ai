"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Globe, Smartphone, Brain, Zap, Database, Megaphone,
  ArrowRight, Menu, X, Mail, MapPin, Phone as PhoneIcon, Send,
  Code2, Server, Palette, GitBranch, Bot,
  Search, ClipboardCheck, Rocket, Headphones,
  ShoppingCart, BarChart3, ChevronRight, ExternalLink,
  type LucideIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const R = "#e84040";

const NAV = [
  { label: "Bosh sahifa", href: "#hero" },
  { label: "Xizmatlar", href: "#services" },
  { label: "Portfolio", href: "#projects" },
  { label: "Jarayon", href: "#process" },
  { label: "Texnologiyalar", href: "#tech" },
];

const SERVICES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Globe, title: "Veb-saytlar", desc: "Zamonaviy va responsive veb-saytlar yaratamiz" },
  { icon: Smartphone, title: "Telegram Mini App", desc: "Telegram ichida ishlaydigan kuchli mini ilovalar" },
  { icon: Brain, title: "AI Yechimlar", desc: "AI agentlar, chatbotlar va avtomatlashgan tizimlar" },
  { icon: Zap, title: "Avtomatlashtirish", desc: "Biznes jarayonlarini tamomila avtomatlashtirish" },
  { icon: Database, title: "CRM & ERP", desc: "Maxsus CRM, ERP tizimlar orqali biznesni boshqarish" },
  { icon: Megaphone, title: "Marketing", desc: "SMM, Target, SEO va boshqa marketing xizmatlari" },
];

interface Project {
  title: string;
  type: string;
  desc: string;
  features: string[];
  tech: string[];
  gradient: string;
  icon: LucideIcon;
}

const PROJECTS: Project[] = [
  {
    title: "DLI Shop",
    type: "Telegram Mini App",
    desc: "Premium Telegram Mini App elektron tijorat platformasi",
    features: ["Mahsulot katalogi", "Admin Panel", "Buyurtma boshqaruvi", "To'lov integratsiyasi", "Telegram Login", "Responsive interfeys"],
    tech: ["TypeScript", "React", "Telegram Mini Apps SDK", "Supabase", "Vercel"],
    gradient: "from-orange-400 to-red-500",
    icon: ShoppingCart,
  },
  {
    title: "TG SMM AI",
    type: "AI Platforma",
    desc: "Telegram ichida ishlovchi AI SMM yordamchisi",
    features: ["AI Content Generator", "Post va Reels g'oyalari", "Kontent kalendari", "Marketing yordamchisi", "Telegram integratsiyasi"],
    tech: ["Next.js", "AI Models", "Telegram API", "Supabase"],
    gradient: "from-violet-500 to-purple-600",
    icon: BarChart3,
  },
  {
    title: "Pari AI",
    type: "AI Assistant",
    desc: "Premium AI Assistant — suhbat, topshiriqlar va avtomatlashtirish",
    features: ["Voice Assistant", "AI Chat", "Obsidian Graph UI", "Premium animatsiyalar", "Zamonaviy UI/UX"],
    tech: ["Next.js", "Multi-model AI", "Supabase", "Railway"],
    gradient: "from-indigo-500 to-blue-600",
    icon: Bot,
  },
  {
    title: "Premium Service Website",
    type: "Veb-sayt",
    desc: "Xizmatlarni taqdim etuvchi zamonaviy landing va portfolio sayti",
    features: ["Responsive dizayn", "Premium animatsiyalar", "Portfolio sahifalari", "Buyurtma tizimi", "Zamonaviy UI"],
    tech: ["Next.js", "Tailwind CSS", "Vercel", "React"],
    gradient: "from-emerald-400 to-teal-500",
    icon: Globe,
  },
];

const SKILLS: Record<string, { icon: LucideIcon; items: string[] }> = {
  Frontend: { icon: Code2, items: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS", "Responsive Design"] },
  Backend: { icon: Server, items: ["API Integration", "Authentication", "Database Integration", "Supabase", "PostgreSQL", "Railway"] },
  AI: { icon: Brain, items: ["OpenAI API", "Anthropic", "Gemini", "Groq", "Prompt Engineering", "AI Automation", "LLM Integrations"] },
  Telegram: { icon: Send, items: ["Telegram Bot API", "Telegram Mini Apps", "Telegram WebApp", "Bot Development"] },
  DevOps: { icon: GitBranch, items: ["Git", "GitHub", "Vercel", "Railway", "Deployment", "CI/CD"] },
  Dizayn: { icon: Palette, items: ["Figma", "UI/UX Design", "Premium Interface Design", "Design Systems", "Branding"] },
};

const STEPS = [
  { n: "01", title: "Tahlil", desc: "Sizning biznesingizni o'rganamiz va analiz qilamiz", icon: Search },
  { n: "02", title: "Reja", desc: "Eng yaxshi yechimni taklif qilib, reja tuzamiz", icon: ClipboardCheck },
  { n: "03", title: "Ishga tushirish", desc: "Loyihani yaratib, sinovdan o'tkazamiz", icon: Rocket },
  { n: "04", title: "Qo'llab-quvvatlash", desc: "Doimiy qo'llab-quvvatlash va rivojlantirish", icon: Headphones },
];

/* ═══════════════════════════════════════════════════════════════
   ANIMATION
   ═══════════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: R }}>
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-lg">
            <span style={{ color: R }}>SADI</span>PRIME
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="#contact" className="hidden sm:inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ background: R }}>
            Bog{"'"}lanish <ArrowRight size={14} />
          </a>
          <button type="button" onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-700" aria-label="Menyu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-gray-700 hover:text-gray-900">{l.label}</a>
          ))}
          <a href="#contact" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 text-white font-semibold px-5 py-3 rounded-full" style={{ background: R }}>
            Bog{"'"}lanish <ArrowRight size={14} />
          </a>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section id="hero" className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
      <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -z-10" style={{ background: `${R}08` }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px] -z-10" style={{ background: `${R}06` }} />
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: `${R}0d`, color: R }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: R }} />
              Raqamli yechimlar agentligi
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.1] tracking-tight mb-6">
              Biz g{"'"}oyalarni <span style={{ color: R }}>raqamli muvaffaqiyatga</span> aylantiramiz
            </motion.h1>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
              Veb-saytlar, ilovalar, AI yechimlar, avtomatlashtirish va marketing — biz biznesingizni keyingi bosqichga olib chiqamiz.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a href="#services" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity" style={{ background: R }}>
                Xizmatlarimiz bilan tanishing <ArrowRight size={16} />
              </a>
              <a href="#projects" className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-full hover:border-gray-300 transition-colors">
                Portfolio ko{"'"}rish <ChevronRight size={16} />
              </a>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="hidden md:flex justify-center relative">
            <div className="w-72 h-72 lg:w-80 lg:h-80 rounded-full flex items-center justify-center relative" style={{ background: `${R}0a` }}>
              <div className="w-56 h-56 lg:w-64 lg:h-64 rounded-full bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: R }}>
                    <span className="text-white text-2xl font-bold">S</span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium tracking-wider">SADIPRIME</div>
                </div>
              </div>
              <div className="absolute -right-2 top-1/4 bg-white border border-gray-100 rounded-2xl shadow-lg px-4 py-3">
                <div className="text-2xl font-bold">99%</div>
                <div className="text-[10px] text-gray-400">Mijozlar qoniqishi</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
   ═══════════════════════════════════════════════════════════════ */

function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <motion.div key={s.title} variants={fadeUp} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300" style={{ background: `${R}0d` }}>
                <s.icon size={22} style={{ color: R }} strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROJECTS
   ═══════════════════════════════════════════════════════════════ */

function ProjectsSection() {
  return (
    <section id="projects" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase mb-3 block" style={{ color: R }}>Portfolio</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Ishlarimiz bilan tanishing</h2>
            <p className="text-gray-500 max-w-lg">Har bir loyiha — bu bizning sifat, ijod va natijaga bo{"'"}lgan yondashuvimiz.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {PROJECTS.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300 group">
                <div className={`h-48 bg-gradient-to-br ${p.gradient} flex items-center justify-center relative`}>
                  <p.icon size={48} className="text-white/80" strokeWidth={1.25} />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-[11px] font-medium text-gray-700 px-3 py-1 rounded-full">{p.type}</div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">{p.desc}</p>
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bajarilgan ishlar</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.features.map((f) => (
                        <span key={f} className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md border border-gray-100">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Texnologiyalar</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tech.map((t) => (
                        <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: `${R}0d`, color: R }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════════ */

function StatsSection() {
  const stats = [
    { value: "4+", label: "Asosiy loyihalar" },
    { value: "6+", label: "Xizmat turlari" },
    { value: "15+", label: "Texnologiyalar" },
    { value: "24/7", label: "Qo'llab-quvvatlash" },
  ];
  return (
    <section className="py-16 bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: R }}>{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS
   ═══════════════════════════════════════════════════════════════ */

function ProcessSection() {
  return (
    <section id="process" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase mb-3 block" style={{ color: R }}>Jarayon</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Oddiy qadamlar, kuchli natijalar</h2>
            <p className="text-gray-500 max-w-lg">Bizning jarayonimiz shaffof va samarali.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={fadeUp} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-white w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: R }}>{s.n}</span>
                  <s.icon size={20} className="text-gray-400" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TECH / SKILLS
   ═══════════════════════════════════════════════════════════════ */

function TechSection() {
  return (
    <section id="tech" className="py-20 bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase mb-3 block" style={{ color: R }}>Ko{"'"}nikmalar</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Texnologiyalar va ko{"'"}nikmalar</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(SKILLS).map(([cat, { icon: Icon, items }]) => (
              <motion.div key={cat} variants={fadeUp} className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${R}0d` }}>
                    <Icon size={20} style={{ color: R }} strokeWidth={1.75} />
                  </div>
                  <h3 className="font-semibold">{cat}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((t) => (
                    <span key={t} className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md border border-gray-100">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTACT
   ═══════════════════════════════════════════════════════════════ */

function ContactSection() {
  const [form, setForm] = useState({ name: "", contact: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "portfolio_order", ...form }),
      });
    } catch { /* proceed anyway */ }
    setSent(true);
    setLoading(false);
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-transparent transition-all";

  return (
    <section id="contact" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Keling, keyingi <span style={{ color: R }}>muvaffaqiyat</span> hikoyasini birga yozamiz
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">G{"'"}oyangizni biz bilan amalga oshiring.</p>
          </motion.div>

          {sent ? (
            <motion.div variants={fadeUp} className="max-w-md mx-auto text-center bg-green-50 border border-green-200 rounded-2xl p-8">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Arizangiz qabul qilindi!</h3>
              <p className="text-green-600 text-sm">Tez orada siz bilan bog{"'"}lanamiz.</p>
            </motion.div>
          ) : (
            <motion.form variants={fadeUp} onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Ismingiz"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
                <input
                  required
                  placeholder="Telefon yoki @telegram"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className={inputCls}
                />
              </div>
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className={inputCls}
              >
                <option value="">Xizmat turini tanlang</option>
                {SERVICES.map((s) => <option key={s.title} value={s.title}>{s.title}</option>)}
              </select>
              <textarea
                placeholder="Loyihangiz haqida qisqacha..."
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={inputCls + " resize-none"}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: R }}
              >
                {loading ? "Yuborilmoqda..." : <>Yuborish <ArrowRight size={16} /></>}
              </button>
              <div className="text-center">
                <a href="https://t.me/xojasoipov" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <Send size={14} /> Telegram orqali yozish
                </a>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: R }}>
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <span className="font-bold"><span style={{ color: R }}>SADI</span>PRIME</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">Raqamli yechimlar orqali biznesingizni keyingi bosqichga olib chiqamiz.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Xizmatlar</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Veb-saytlar</li>
              <li>Telegram Mini App</li>
              <li>AI Yechimlar</li>
              <li>Avtomatlashtirish</li>
              <li>Marketing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Kompaniya</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#projects" className="hover:text-gray-700">Portfolio</a></li>
              <li><a href="#process" className="hover:text-gray-700">Jarayon</a></li>
              <li><a href="#tech" className="hover:text-gray-700">Texnologiyalar</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Aloqa</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><Mail size={14} /> xojasoipov@gmail.com</li>
              <li className="flex items-center gap-2"><Send size={14} /> @xojasoipov</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Andijon, O{"'"}zbekiston</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} SADIPRIME. Barcha huquqlar himoyalangan.</p>
          <p className="text-xs text-gray-400">Made with ❤️ in Uzbekistan</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Navbar />
      <main>
        <Hero />
        <ServicesSection />
        <ProjectsSection />
        <StatsSection />
        <ProcessSection />
        <TechSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
