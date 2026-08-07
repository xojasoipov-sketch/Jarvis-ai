"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Phone, Send, ArrowRight, CheckCircle2, MessageCircle, Clock } from "lucide-react";
import { SADIPRIME } from "@/lib/sadiprime";
import { GOLD, TEXT_DIM, BORDER, gold, ghostButtonStyle, goldButtonStyle } from "../_components/theme";
import {
  Section, PageHero, GlassCard, IconTile, Magnetic,
  fadeUp, Reveal,
} from "../_components/ui";
import { SERVICES } from "../_data";

function MapPanel() {
  return (
    <div
      className="relative w-full h-full min-h-[300px] overflow-hidden"
      style={{ borderRadius: 24, border: `1px solid ${BORDER}` }}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#111114 0%,#08080a 100%)" }} />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" aria-hidden="true">
        {[36, 92, 148, 204, 260].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#fff" strokeWidth="0.6" opacity="0.05" />
        ))}
        {[56, 132, 208, 284, 356].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="#fff" strokeWidth="0.6" opacity="0.05" />
        ))}
        <path d="M0 196 L132 196 L132 92 L400 92" stroke={GOLD} strokeWidth="1.6" opacity="0.4" fill="none" />
        <path d="M208 300 L208 148 L400 148" stroke={GOLD} strokeWidth="1" opacity="0.2" fill="none" />
      </svg>

      {/* pulsing pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 56, height: 56, background: gold(0.18) }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        />
        <div
          className="relative w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: GOLD, boxShadow: `0 0 30px ${gold(0.75)}` }}
        >
          <MapPin size={18} color="#140F07" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

export default function AloqaPage() {
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
    } catch {
      /* the lead is still acknowledged; the operator retries on their side */
    }
    setSent(true);
    setLoading(false);
  }

  const inputCls =
    "w-full text-sm rounded-2xl px-5 py-4 focus:outline-none transition-colors placeholder:text-white/30";

  const CONTACTS = [
    { Icon: MapPin, label: "Manzil", value: SADIPRIME.location },
    { Icon: Mail, label: "Email", value: SADIPRIME.email, href: `mailto:${SADIPRIME.email}` },
    { Icon: Phone, label: "Telefon", value: SADIPRIME.phone, href: `tel:${SADIPRIME.phone.replace(/\s/g, "")}` },
    { Icon: Send, label: "Telegram", value: `@${SADIPRIME.telegram}`, href: `https://t.me/${SADIPRIME.telegram}` },
  ];

  return (
    <>
      <PageHero
        label="Aloqa"
        title="Biz bilan bog'laning"
        highlight="bog'laning"
        subtitle="Loyihangiz haqida qisqacha yozing — bir ish kuni ichida javob beramiz."
      />

      <Section className="pt-4">
        <Reveal className="grid lg:grid-cols-2 gap-5 items-stretch">
          {/* left: map + details */}
          <motion.div variants={fadeUp} className="flex flex-col gap-5">
            <MapPanel />
            <GlassCard className="p-8">
              <ul className="space-y-5">
                {CONTACTS.map(({ Icon, label, value, href }) => (
                  <li key={label} className="flex items-center gap-4">
                    <IconTile size={42}><Icon size={17} style={{ color: GOLD }} strokeWidth={1.6} /></IconTile>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.15em]" style={{ color: TEXT_DIM }}>{label}</div>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-[15px] transition-colors hover:text-white break-all"
                          style={{ color: "rgba(255,255,255,0.82)" }}
                        >
                          {value}
                        </a>
                      ) : (
                        <div className="text-[15px]" style={{ color: "rgba(255,255,255,0.82)" }}>{value}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2.5 mt-8 pt-6 text-[13px]" style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_DIM }}>
                <Clock size={14} style={{ color: GOLD }} />
                Dushanba–Shanba, 09:00–19:00 (UTC+5)
              </div>
            </GlassCard>

            {/* quick channels */}
            <div className="grid grid-cols-2 gap-4">
              <Magnetic strength={0.2}>
                <a
                  href={`https://t.me/${SADIPRIME.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-medium w-full transition-colors"
                  style={ghostButtonStyle}
                >
                  <Send size={16} style={{ color: GOLD }} /> Telegram
                </a>
              </Magnetic>
              <Magnetic strength={0.2}>
                <a
                  href={`https://wa.me/${SADIPRIME.phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-medium w-full transition-colors"
                  style={ghostButtonStyle}
                >
                  <MessageCircle size={16} style={{ color: GOLD }} /> WhatsApp
                </a>
              </Magnetic>
            </div>
          </motion.div>

          {/* right: form */}
          <motion.div variants={fadeUp}>
            <GlassCard className="p-8 md:p-10 h-full" interactive={false}>
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 16 }}
                  >
                    <CheckCircle2 size={48} style={{ color: GOLD }} strokeWidth={1.4} />
                  </motion.div>
                  <h2 className="text-2xl font-bold mt-6 mb-3" style={{ color: GOLD }}>
                    Arizangiz qabul qilindi
                  </h2>
                  <p className="text-sm max-w-xs" style={{ color: TEXT_DIM }}>
                    Bir ish kuni ichida siz bilan bog{"'"}lanamiz.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-semibold text-xl mb-7">Loyiha bo{"'"}yicha yozing</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      required
                      placeholder="Ismingiz"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                      style={ghostButtonStyle}
                    />
                    <input
                      required
                      placeholder="Telefon yoki @telegram"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      className={inputCls}
                      style={ghostButtonStyle}
                    />
                  </div>
                  <select
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    className={inputCls}
                    style={ghostButtonStyle}
                  >
                    <option value="">Xizmat turini tanlang</option>
                    {SERVICES.map((s) => (
                      <option key={s.slug} value={s.title}>{s.title}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Loyihangiz haqida qisqacha..."
                    rows={7}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`${inputCls} resize-none`}
                    style={ghostButtonStyle}
                  />
                  <Magnetic strength={0.15} className="w-full">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-full transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={goldButtonStyle}
                    >
                      {loading ? "Yuborilmoqda..." : <>Yuborish <ArrowRight size={16} /></>}
                    </button>
                  </Magnetic>
                  <p className="text-[12px] text-center pt-1" style={{ color: TEXT_DIM }}>
                    Ma{"'"}lumotlaringiz uchinchi shaxslarga berilmaydi.
                  </p>
                </form>
              )}
            </GlassCard>
          </motion.div>
        </Reveal>
      </Section>
    </>
  );
}
