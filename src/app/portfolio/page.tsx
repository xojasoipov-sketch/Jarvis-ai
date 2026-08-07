"use client";

import { useState, type FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Globe, Send, Sparkles, Settings2, TrendingUp,
  ArrowRight, ArrowUpRight, Menu, X, Mail, MapPin,
  Play, ChevronLeft, ChevronRight, Plus,
  Search, ClipboardCheck, Rocket, Headphones,
  Folder, Users, Award, Camera,
  type LucideIcon,
} from "lucide-react";
import { SADIPRIME, SERVICES as SERVICES_RAW, STATS } from "@/lib/sadiprime";

/* ═══════════════════════════════════════════════════════════════
   THEME — dark + gold, matching the reference design 1:1
   ═══════════════════════════════════════════════════════════════ */

const GOLD = "#d9a95c";
const BG = "#0a0a0d";
const PANEL = "#111116";
const BORDER = "rgba(255,255,255,0.08)";

const NAV = [
  { label: "Bosh sahifa", href: "#hero" },
  { label: "Xizmatlar", href: "#services" },
  { label: "Portfolio", href: "#projects" },
  { label: "Jarayon", href: "#process" },
  { label: "Narxlar", href: "#narxlar" },
  { label: "Blog", href: "#blog" },
  { label: "Biz haqimizda", href: "#about" },
];

const SERVICE_ICONS: LucideIcon[] = [Globe, Send, Sparkles, Settings2, TrendingUp];
const SERVICE_ORDER = ["Veb-saytlar", "Telegram Mini App", "AI Yechimlar", "Avtomatlashtirish", "Marketing"];
const SERVICES = SERVICE_ORDER.map((title, i) => ({
  ...SERVICES_RAW.find((s) => s.title === title)!,
  Icon: SERVICE_ICONS[i],
}));

interface Project {
  title: string;
  tag: string;
  gradient: string;
}
const PROJECTS: Project[] = [
  { title: "DLI SHOP", tag: "Telegram Mini App", gradient: "linear-gradient(150deg,#1a1410 0%,#3a2410 55%,#1a1410 100%)" },
  { title: "SADIPRIME AI", tag: "AI Platforma", gradient: "linear-gradient(150deg,#0b1220 0%,#12233d 55%,#0b1220 100%)" },
  { title: "Real Estate Platform", tag: "Veb-sayt", gradient: "linear-gradient(150deg,#171512 0%,#3a3226 55%,#171512 100%)" },
  { title: "CRM Boshqaruv", tag: "Tizim", gradient: "linear-gradient(150deg,#0c1013 0%,#1a2a2e 55%,#0c1013 100%)" },
];

const STAT_ICONS: LucideIcon[] = [Folder, Users, Award, TrendingUp, Headphones];

const STEPS = [
  { n: "01", title: "Tahlil", desc: "Sizning biznesingizni o'rganamiz va analiz qilamiz", icon: Search },
  { n: "02", title: "Reja", desc: "Eng yaxshi yechimni taklif qilib, reja tuzamiz", icon: ClipboardCheck },
  { n: "03", title: "Ishga tushirish", desc: "Loyihani yaratib, sinovdan o'tkazamiz", icon: Rocket },
  { n: "04", title: "Qo'llab-quvvatlash", desc: "Doimiy qo'llab-quvvatlash va rivojlantirish", icon: Headphones },
];

/* ═══════════════════════════════════════════════════════════════
   ANIMATION
   ═══════════════════════════════════════════════════════════════ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ═══════════════════════════════════════════════════════════════
   LOGO MARK
   ═══════════════════════════════════════════════════════════════ */

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke={GOLD} strokeWidth="1.4" fill="none" />
      <path d="M12 7 L17 12 L12 17 L7 12 Z" stroke={GOLD} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 inset-x-0 z-50" style={{ background: "rgba(10,10,13,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-semibold text-[15px] tracking-wide text-white">
            <span style={{ color: GOLD }}>SADI</span>PRIME
          </span>
        </a>
        <div className="hidden lg:flex items-center gap-7">
          {NAV.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] transition-colors"
              style={{ color: i === 0 ? GOLD : "rgba(255,255,255,0.55)" }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="hidden sm:inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: "#1a1408" }}
          >
            Buyurtma berish <ArrowRight size={14} />
          </a>
          <button type="button" onClick={() => setOpen(!open)} className="lg:hidden p-2 text-white" aria-label="Menyu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden px-5 py-4 space-y-1" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
          {NAV.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-white/70 hover:text-white">{l.label}</a>
          ))}
          <a href="#contact" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-full" style={{ background: GOLD, color: "#1a1408" }}>
            Buyurtma berish <ArrowRight size={14} />
          </a>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */

function HeroVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[420px] mx-auto">
      {/* orbit ring */}
      <div className="absolute inset-[6%] rounded-full" style={{ border: `1px solid rgba(217,169,92,0.18)` }} />
      {/* small orbiting spheres */}
      <div className="absolute rounded-full" style={{ width: 10, height: 10, top: "8%", left: "48%", background: "radial-gradient(circle at 35% 30%, #444, #111)" }} />
      <div className="absolute rounded-full" style={{ width: 7, height: 7, bottom: "10%", right: "6%", background: "radial-gradient(circle at 35% 30%, #444, #111)" }} />
      {/* rock cluster glow */}
      <div className="absolute inset-[10%] rounded-[38%] blur-2xl opacity-70" style={{ background: `radial-gradient(circle at 55% 45%, ${GOLD}55, transparent 60%)` }} />
      <div
        className="absolute inset-[12%] rounded-[42%_38%_44%_36%/40%_44%_36%_42%]"
        style={{
          background: "linear-gradient(155deg, #26221f 0%, #17140f 45%, #0c0a08 100%)",
          boxShadow: `inset 0 0 60px rgba(0,0,0,0.6), 0 0 80px ${GOLD}22`,
        }}
      >
        {/* glowing cracks */}
        <div className="absolute inset-0 rounded-[inherit] opacity-80" style={{
          background: `radial-gradient(ellipse 60% 40% at 60% 55%, ${GOLD}66 0%, transparent 55%)`,
        }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
          <path d="M20 55 L45 40 L55 60 L80 35" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
          <path d="M30 70 L50 58 L48 80" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      {/* gold triangle logo, centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="34%" height="34%" viewBox="0 0 100 100" fill="none">
          <path d="M50 10 L88 75 L12 75 Z" stroke={GOLD} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        </svg>
      </div>
      {/* floating "7+ Yillik tajriba" */}
      <div className="absolute bottom-[6%] right-0 text-right">
        <div className="text-3xl font-bold text-white leading-none">7+</div>
        <div className="text-[11px] text-white/40 mt-1">Yillik tajriba</div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="hero" className="pt-32 pb-16 md:pt-40 md:pb-20 relative overflow-hidden" style={{ background: BG }}>
      {/* left-edge social rail */}
      <div className="hidden lg:flex flex-col items-center gap-4 fixed left-6 top-1/2 -translate-y-1/2 z-40">
        <a href="https://t.me/xojasoipov" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><Send size={16} /></a>
        <a href="#" className="text-white/40 hover:text-white transition-colors"><Camera size={16} /></a>
        <span className="text-white/40 text-[11px] font-semibold">Be</span>
        <div className="w-px h-16 bg-white/15" />
      </div>

      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider"
              style={{ border: `1px solid ${BORDER}`, color: GOLD }}
            >
              SADIPRIME — raqamli yechimlar agentligi
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-[3.3rem] font-bold leading-[1.15] tracking-tight mb-6 text-white">
              Biz g{"'"}oyalarni<br />
              <span style={{ color: GOLD }}>raqamli muvaffaqiyatga</span><br />
              aylantiramiz
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/45 text-base leading-relaxed mb-8 max-w-md">
              Veb-saytlar, ilovalar, AI yechimlar, avtomatlashtirish va marketing — biz biznesingizni keyingi bosqichga olib chiqamiz.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 mb-10">
              <a href="#services" className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-opacity hover:opacity-90" style={{ background: GOLD, color: "#1a1408" }}>
                Xizmatlarimiz bilan tanishing <ArrowRight size={16} />
              </a>
              <a href="#projects" className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-full text-white transition-colors" style={{ border: `1px solid ${BORDER}` }}>
                Portfolio ko{"'"}rish <ChevronRight size={16} />
              </a>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Showreelni tomosha qilish"
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: `1px solid ${BORDER}`, background: PANEL }}
              >
                <Play size={14} className="text-white ml-0.5" fill="currentColor" />
              </button>
              <div className="text-sm">
                <div className="text-white/80 font-medium leading-tight">Showreel</div>
                <div className="text-white/35 text-xs leading-tight">Tomosha qiling</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.25 }}>
            <HeroVisual />
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
    <section id="services" className="py-14" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {SERVICES.map((s) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              className="relative rounded-2xl p-5 group transition-colors"
              style={{ background: PANEL, border: `1px solid ${BORDER}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${GOLD}1a` }}>
                <s.Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-white text-[15px] mb-1.5">{s.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed pr-4">{s.desc}</p>
              <ArrowUpRight size={14} className="absolute bottom-5 right-5 text-white/25 group-hover:text-white/60 transition-colors" />
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
    <section id="projects" className="py-16" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center text-[11px] font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-wider" style={{ border: `1px solid ${BORDER}`, color: GOLD }}>
                Portfolio
              </div>
              <h2 className="text-3xl md:text-[2.6rem] font-bold tracking-tight text-white leading-[1.1]">
                Tanlangan<br />ishlarimiz
              </h2>
              <a href="#projects" className="inline-flex items-center gap-2 mt-5 text-sm font-medium px-5 py-2.5 rounded-full text-white transition-colors" style={{ border: `1px solid ${BORDER}` }}>
                Barcha loyihalar <ArrowRight size={14} />
              </a>
            </motion.div>
            <motion.div variants={fadeUp} className="hidden md:flex items-center gap-2">
              <button type="button" aria-label="Oldingi" className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors" style={{ border: `1px solid ${BORDER}` }}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Keyingi" className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-90" style={{ background: GOLD, color: "#1a1408" }}>
                <ChevronRight size={16} />
              </button>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PROJECTS.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="relative rounded-2xl overflow-hidden aspect-[3/4] group cursor-pointer">
                <div className="absolute inset-0" style={{ background: p.gradient }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <span className="text-white/90 font-semibold text-sm leading-tight">{p.title}</span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white/80" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}` }}>
                    {p.tag}
                  </span>
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
  return (
    <section className="py-10" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="rounded-2xl grid grid-cols-2 md:grid-cols-5 divide-x"
          style={{ background: PANEL, border: `1px solid ${BORDER}`, borderColor: BORDER }}
        >
          {STATS.map((s, i) => {
            const Icon = STAT_ICONS[i];
            return (
              <motion.div key={s.label} variants={fadeUp} className="flex items-center gap-3 px-5 py-6" style={{ borderColor: BORDER }}>
                <Icon size={18} style={{ color: GOLD }} strokeWidth={1.75} />
                <div>
                  <div className="text-xl font-bold text-white leading-none">{s.value}</div>
                  <div className="text-[11px] text-white/40 mt-1 leading-tight">{s.label}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS + CTA
   ═══════════════════════════════════════════════════════════════ */

function ProcessSection() {
  return (
    <section id="process" className="py-16" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div>
            <motion.div variants={fadeUp} className="mb-8">
              <div className="inline-flex items-center text-[11px] font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-wider" style={{ border: `1px solid ${BORDER}`, color: GOLD }}>
                Jarayon
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Oddiy qadamlar,<br />kuchli natijalar
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((s) => (
                <motion.div key={s.n} variants={fadeUp} className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-xs font-semibold mb-3" style={{ color: GOLD }}>{s.n}</div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{s.title}</h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div variants={fadeUp} className="rounded-2xl p-7" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
            <h3 className="text-lg font-bold text-white mb-2 leading-snug">Loyihangizni boshlashga tayyormisiz?</h3>
            <p className="text-[13px] text-white/40 leading-relaxed mb-6">
              Bepul konsultatsiya oling va biznesingiz uchun eng yaxshi yechimni toping.
            </p>
            <div className="flex items-center gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90" style={{ background: GOLD, color: "#1a1408" }}>
                Buyurtma berish <ArrowRight size={14} />
              </a>
              <a href="#contact" aria-label="Bog'lanish" className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                <Plus size={16} />
              </a>
            </div>
          </motion.div>
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

  const inputCls = "w-full text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all placeholder:text-white/30";
  const inputStyle = { background: PANEL, border: `1px solid ${BORDER}` };

  return (
    <section id="contact" className="py-20" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
              Keling, keyingi <span style={{ color: GOLD }}>muvaffaqiyat</span> hikoyasini birga yozamiz
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">G{"'"}oyangizni biz bilan amalga oshiring.</p>
          </motion.div>

          {sent ? (
            <motion.div variants={fadeUp} className="max-w-md mx-auto text-center rounded-2xl p-8" style={{ background: PANEL, border: `1px solid ${GOLD}44` }}>
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Arizangiz qabul qilindi!</h3>
              <p className="text-white/50 text-sm">Tez orada siz bilan bog{"'"}lanamiz.</p>
            </motion.div>
          ) : (
            <motion.form variants={fadeUp} onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input required placeholder="Ismingiz" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} />
                <input required placeholder="Telefon yoki @telegram" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="">Xizmat turini tanlang</option>
                {SERVICES.map((s) => <option key={s.title} value={s.title}>{s.title}</option>)}
              </select>
              <textarea placeholder="Loyihangiz haqida qisqacha..." rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls + " resize-none"} style={inputStyle} />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: GOLD, color: "#1a1408" }}
              >
                {loading ? "Yuborilmoqda..." : <>Yuborish <ArrowRight size={16} /></>}
              </button>
              <div className="text-center">
                <a href="https://t.me/xojasoipov" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
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
    <footer className="py-12" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LogoMark size={20} />
              <span className="font-semibold text-white"><span style={{ color: GOLD }}>SADI</span>PRIME</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">Raqamli yechimlar orqali biznesingizni keyingi bosqichga olib chiqamiz.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Xizmatlar</h4>
            <ul className="space-y-2 text-sm text-white/40">
              {SERVICES.map((s) => <li key={s.title}>{s.title}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Kompaniya</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><a href="#projects" className="hover:text-white/70 transition-colors">Portfolio</a></li>
              <li><a href="#process" className="hover:text-white/70 transition-colors">Jarayon</a></li>
              <li><a href="#about" className="hover:text-white/70 transition-colors">Biz haqimizda</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Aloqa</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li className="flex items-center gap-2"><Mail size={14} /> {SADIPRIME.email}</li>
              <li className="flex items-center gap-2"><Send size={14} /> @{SADIPRIME.telegram}</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> {SADIPRIME.location}</li>
            </ul>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} SADIPRIME. Barcha huquqlar himoyalangan.</p>
          <p className="text-xs text-white/30">Made with ❤️ in Uzbekistan</p>
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
    <div className="min-h-screen antialiased" style={{ background: BG, color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Navbar />
      <main>
        <Hero />
        <ServicesSection />
        <ProjectsSection />
        <StatsSection />
        <ProcessSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
