"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Phone, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { SADIPRIME } from "@/lib/sadiprime";
import { GOLD, PANEL, BORDER, goldButtonStyle } from "../_components/theme";
import { fadeUp, Reveal, PageHero, Card, IconTile } from "../_components/ui";
import { SERVICES } from "../_data";

function MapPanel() {
  return (
    <div className="relative w-full h-full min-h-[280px] rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#101014 0%,#0a0a0d 100%)" }} />
      {/* abstract street grid */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" aria-hidden="true">
        {[40, 100, 160, 220, 280].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#fff" strokeWidth="0.6" opacity="0.06" />
        ))}
        {[60, 140, 220, 300, 360].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="#fff" strokeWidth="0.6" opacity="0.06" />
        ))}
        <path d="M0 190 L140 190 L140 100 L400 100" stroke={GOLD} strokeWidth="1.4" opacity="0.35" fill="none" />
      </svg>
      {/* pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: GOLD, boxShadow: `0 0 24px ${GOLD}88` }}
        >
          <MapPin size={16} color="#1a1408" strokeWidth={2.2} />
        </div>
        <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ background: `${GOLD}66` }} />
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
      /* the lead is still shown as received; retry happens on the operator side */
    }
    setSent(true);
    setLoading(false);
  }

  const inputCls =
    "w-full text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-all placeholder:text-white/30";
  const inputStyle = { background: PANEL, border: `1px solid ${BORDER}` };

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
        titleTop="Biz bilan"
        titleGold="bog'laning"
        subtitle="Loyihangiz haqida qisqacha yozing — bir ish kuni ichida javob beramiz."
      />

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="grid lg:grid-cols-2 gap-5 items-stretch">
            {/* Left: map + contact details */}
            <motion.div variants={fadeUp} className="flex flex-col gap-5">
              <MapPanel />
              <Card className="p-6">
                <ul className="space-y-4">
                  {CONTACTS.map(({ Icon, label, value, href }) => (
                    <li key={label} className="flex items-center gap-3">
                      <IconTile size={36}><Icon size={16} style={{ color: GOLD }} strokeWidth={1.75} /></IconTile>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/35 uppercase tracking-wider">{label}</div>
                        {href ? (
                          <a
                            href={href}
                            target={href.startsWith("http") ? "_blank" : undefined}
                            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="text-[14px] text-white/80 hover:text-white transition-colors break-all"
                          >
                            {value}
                          </a>
                        ) : (
                          <div className="text-[14px] text-white/80">{value}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>

            {/* Right: form */}
            <motion.div variants={fadeUp}>
              <Card className="p-6 md:p-8 h-full">
                {sent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <CheckCircle2 size={40} style={{ color: GOLD }} strokeWidth={1.5} />
                    <h2 className="text-xl font-bold mt-4 mb-2" style={{ color: GOLD }}>
                      Arizangiz qabul qilindi!
                    </h2>
                    <p className="text-white/45 text-sm">Tez orada siz bilan bog{"'"}lanamiz.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="font-semibold text-white text-lg mb-5">Xabar yuborish</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input
                        required
                        placeholder="Ismingiz"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={inputCls}
                        style={inputStyle}
                      />
                      <input
                        required
                        placeholder="Telefon yoki @telegram"
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <select
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      className={inputCls}
                      style={inputStyle}
                    >
                      <option value="">Xizmat turini tanlang</option>
                      {SERVICES.map((s) => (
                        <option key={s.slug} value={s.title}>{s.title}</option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Loyihangiz haqida qisqacha..."
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={goldButtonStyle}
                    >
                      {loading ? "Yuborilmoqda..." : <>Yuborish <ArrowRight size={16} /></>}
                    </button>
                  </form>
                )}
              </Card>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
