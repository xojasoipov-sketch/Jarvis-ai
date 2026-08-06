"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, AnimatePresence, type Variants } from "framer-motion";
import { SADIPRIME, SERVICES, PROJECTS, PROCESS, STATS } from "@/lib/sadiprime";

/* ── palette ── */
const OG = "#ff6a1a";
const OG2 = "#ff8c48";
const DARK = "#0a0b12";
const CARD = "#111218";
const BORDER = "rgba(255,255,255,0.07)";

/* ── fade-up variant ── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

/* ── animated counter ── */
function Counter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const num = parseInt(target.replace(/\D/g, "")) || 0;
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) mv.set(num);
  }, [inView, mv, num]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v).toString()));
  }, [spring]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

/* ── nav links ── */
const NAV = [
  { label: "Bosh sahifa", href: "#hero" },
  { label: "Xizmatlar", href: "#xizmatlar" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Jarayon", href: "#jarayon" },
  { label: "Narxlar", href: "#narxlar" },
  { label: "Biz haqimizda", href: "#biz" },
];

/* ── service icons (lucide-style inline SVG) ── */
const SERVICE_ICONS: Record<string, string> = {
  "Veb-saytlar": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  "Telegram Mini App": "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  "AI Yechimlar": "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z",
  "Avtomatlashtirish": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
  "CRM & ERP": "M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z",
  "Marketing": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  "UI/UX Dizayn": "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  "Mobil ilovalar": "M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",
};

/* ── project colors ── */
const PROJECT_BG = ["#1a1018", "#101a18", "#101218", "#181a10"];
const PROJECT_ACCENT = [OG, "#1db954", "#4f8fff", "#f5c518"];

export default function PortfolioPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderService, setOrderService] = useState("");
  const [orderMsg, setOrderMsg] = useState("");
  const [orderSent, setOrderSent] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  /* scroll spy */
  useEffect(() => {
    const ids = ["hero", "xizmatlar", "portfolio", "jarayon", "narxlar", "biz"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { threshold: 0.3 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* send order via Telegram */
  async function sendOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderName || !orderMsg) return;
    setOrderLoading(true);
    try {
      const text =
        `📦 *Yangi zakaz (Portfolio)*\n\n` +
        `👤 *Ism:* ${orderName}\n` +
        `🛠 *Xizmat:* ${orderService || "Ko'rsatilmagan"}\n` +
        `💬 *Xabar:* ${orderMsg}`;
      await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, parse_mode: "Markdown" }),
      });
      setOrderSent(true);
    } catch {
      setOrderSent(true); // still show success
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <div style={{ background: DARK, color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", minHeight: "100dvh" }}>

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(10,11,18,0.85)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 60,
        }}
      >
        {/* Logo */}
        <a href="#hero" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: OG,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 13, color: "#fff",
          }}>SP</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px", color: "#fff" }}>
            SADIPRIME
          </span>
        </a>

        {/* Desktop nav */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} className="hide-mobile">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: activeSection === n.href.slice(1) ? OG : "rgba(255,255,255,0.6)",
              textDecoration: "none", transition: "color 0.2s",
            }}>
              {n.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setOrderOpen(true)}
            style={{
              background: OG, border: "none", borderRadius: 20, padding: "8px 18px",
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              letterSpacing: "-0.2px",
            }}
          >
            Buyurtma berish →
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "none" }}
            className="show-mobile"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "fixed", top: 60, left: 0, right: 0, zIndex: 99,
              background: "#111218", borderBottom: `1px solid ${BORDER}`,
              padding: "12px 0",
            }}
          >
            {NAV.map((n) => (
              <a key={n.href} href={n.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block", padding: "12px 24px", fontSize: 15, fontWeight: 500,
                  color: activeSection === n.href.slice(1) ? OG : "rgba(255,255,255,0.75)",
                  textDecoration: "none",
                }}
              >
                {n.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section id="hero" style={{ paddingTop: 120, paddingBottom: 80, padding: "120px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">
          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.p variants={fadeUp} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: OG, textTransform: "uppercase", marginBottom: 16 }}>
              Raqamli Yechimlar Agentligi
            </motion.p>
            <motion.h1 variants={fadeUp} style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
              Biz g&apos;oyalarni{" "}
              <span style={{ color: OG }}>raqamli muvaffaqiyatga</span>{" "}
              aylantiramiz
            </motion.h1>
            <motion.p variants={fadeUp} style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              {SADIPRIME.description}
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setOrderOpen(true)} style={{
                background: OG, border: "none", borderRadius: 24, padding: "13px 28px",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "-0.3px",
              }}>
                Xizmatlarimiz bilan tanishing →
              </button>
              <a href="#portfolio" style={{
                display: "flex", alignItems: "center", gap: 8,
                border: `1px solid ${BORDER}`, borderRadius: 24, padding: "13px 24px",
                color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: 15, textDecoration: "none",
              }}>
                Portfolio ko&apos;rish →
              </a>
            </motion.div>

            {/* Stats strip */}
            <motion.div variants={fadeUp} style={{ display: "flex", gap: 24, marginTop: 44, flexWrap: "wrap" }}>
              {STATS.map((s) => {
                const num = s.value.replace(/\D/g, "");
                const suffix = s.value.replace(/\d/g, "");
                return (
                  <div key={s.label}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: OG, lineHeight: 1 }}>
                      <Counter target={num} />{suffix}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s.label}</div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* 3D-style hero graphic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <HeroGraphic />
          </motion.div>
        </div>
      </section>

      {/* ── SERVICES MARQUEE ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, overflow: "hidden", padding: "0" }}>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", gap: 0, whiteSpace: "nowrap" }}
        >
          {[...SERVICES, ...SERVICES].map((s, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 28px", borderRight: `1px solid ${BORDER}`,
              minWidth: "max-content",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={OG}>
                <path d={SERVICE_ICONS[s.title] || "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"} />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{s.title}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── SERVICES ── */}
      <Section id="xizmatlar">
        <SectionLabel>Xizmatlar</SectionLabel>
        <SectionTitle>
          Bizning <Accent>xizmatlarimiz</Accent> sizning biznesingiz uchun
        </SectionTitle>
        <SectionDesc>Biz biznesingiz uchun eng zamonaviy va samarali raqamli yechimlarni taqdim etamiz.</SectionDesc>

        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, marginTop: 40 }}
        >
          {SERVICES.map((s) => (
            <motion.div key={s.title} variants={fadeUp}
              whileHover={{ y: -4, borderColor: "rgba(255,106,26,0.4)" }}
              style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
                padding: "24px", cursor: "default", transition: "border-color 0.2s",
              }}
            >
              <div style={{ marginBottom: 14, width: 40, height: 40, borderRadius: 10, background: "rgba(255,106,26,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={OG}>
                  <path d={SERVICE_ICONS[s.title] || "M12 2L2 7l10 5 10-5-10-5z"} />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{s.desc}</div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 4, color: OG, fontSize: 13, fontWeight: 600 }}>
                Batafsil →
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA banner */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{
            marginTop: 40, borderRadius: 16, background: "rgba(255,106,26,0.07)",
            border: `1px solid rgba(255,106,26,0.2)`, padding: "24px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          }}
        >
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.75)" }}>
            Kerakli xizmatni topa olmadingizmi? Biz individual yechimlar ham tayyorlaymiz.
          </span>
          <button onClick={() => setOrderOpen(true)} style={{
            background: OG, border: "none", borderRadius: 20, padding: "10px 20px",
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Biz bilan bog&apos;lanish →
          </button>
        </motion.div>
      </Section>

      {/* ── PORTFOLIO ── */}
      <Section id="portfolio" style={{ background: "#0d0e16" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }} className="portfolio-grid">
          <div>
            <SectionLabel>Portfolio</SectionLabel>
            <SectionTitle style={{ marginBottom: 12 }}>
              Tanlangan <Accent>ishlarimiz</Accent>
            </SectionTitle>
            <a href="#portfolio" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none", marginTop: 8 }}>
              Barcha loyihalar →
            </a>
          </div>
          <div />
        </div>

        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginTop: 32 }}
        >
          {PROJECTS.map((p, i) => (
            <motion.div key={p.id} variants={fadeUp}
              whileHover={{ y: -6, scale: 1.01 }}
              style={{
                borderRadius: 18, overflow: "hidden", cursor: "pointer",
                background: PROJECT_BG[i % PROJECT_BG.length],
                border: `1px solid ${BORDER}`, position: "relative",
              }}
            >
              {/* Card header */}
              <div style={{
                height: 140, background: `linear-gradient(135deg, ${PROJECT_BG[i % PROJECT_BG.length]}, rgba(255,255,255,0.03))`,
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                borderBottom: `1px solid ${BORDER}`,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: PROJECT_ACCENT[i % PROJECT_ACCENT.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 18, color: "#fff", letterSpacing: "-0.5px",
                }}>
                  {p.title.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "3px 10px",
                  fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)",
                }}>
                  {p.status}
                </div>
              </div>
              <div style={{ padding: "18px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: PROJECT_ACCENT[i % PROJECT_ACCENT.length], fontWeight: 600, marginBottom: 10 }}>{p.type}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{p.summary}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── STATS ── */}
      <motion.div
        variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{
          display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 0,
          borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {STATS.map((s, i) => {
          const num = s.value.replace(/\D/g, "");
          const suffix = s.value.replace(/\d/g, "");
          return (
            <motion.div key={s.label} variants={fadeUp}
              style={{
                flex: "1 1 140px", textAlign: "center", padding: "32px 20px",
                borderRight: i < STATS.length - 1 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, color: OG, lineHeight: 1 }}>
                <Counter target={num} />{suffix}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{s.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── PROCESS ── */}
      <Section id="jarayon">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }} className="process-grid">
          <div>
            <SectionLabel>Jarayon</SectionLabel>
            <SectionTitle>
              Oddiy qadamlar,{" "}
              <span style={{ display: "block" }}><Accent>kuchli natijalar</Accent></span>
            </SectionTitle>
            <SectionDesc>Bizning jarayonimiz shaffof va samarali.</SectionDesc>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setOrderOpen(true)}
              style={{
                marginTop: 24, background: "none", border: `1px solid ${OG}`, borderRadius: 20,
                padding: "10px 22px", color: OG, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Batafsil ko&apos;rish →
            </motion.button>
          </div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {PROCESS.map((step, i) => (
              <motion.div key={step.n} variants={fadeUp}
                style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
              >
                <div style={{
                  minWidth: 42, height: 42, borderRadius: 12,
                  background: i === 0 ? OG : "rgba(255,106,26,0.12)",
                  border: `1px solid rgba(255,106,26,0.3)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 12, color: i === 0 ? "#fff" : OG,
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── WHY US ── */}
      <Section id="biz" style={{ background: "#0d0e16" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="why-grid">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <SectionTitle>Nega aynan <Accent>SADIPRIME?</Accent></SectionTitle>
            <SectionDesc>Biz faqat kod yozmaymiz, biz biznesingiz uchun natija yaratamiz.</SectionDesc>
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}
            >
              {[
                "Natijaga yo'naltirilgan yondashuv",
                "Zamonaviy texnologiyalar",
                "Individual yechimlar",
                "O'z vaqtida va sifatli bajarish",
                "Uzoq muddatli hamkorlik",
              ].map((item) => (
                <motion.div key={item} variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, background: "rgba(255,106,26,0.15)",
                    border: `1px solid rgba(255,106,26,0.4)`, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{item}</span>
                </motion.div>
              ))}
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setOrderOpen(true)}
              style={{
                marginTop: 28, background: OG, border: "none", borderRadius: 22,
                padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Biz haqimizda ko&apos;proq →
            </motion.button>
          </motion.div>

          {/* Crown graphic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <CrownGraphic />
          </motion.div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section id="narxlar">
        <SectionLabel>Mijozlarimiz fikri</SectionLabel>
        <SectionTitle>Ular bizga <Accent>ishonishdi</Accent></SectionTitle>
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, marginTop: 40 }}
        >
          {[
            { name: "Behzod I.", role: "CEO, DLI SHOP", avatar: "BI", text: "SADIPRIME jamoasi biz bilan ishlash ajoyib tajriba bo'ldi. Biz uchun noyob, tez va xudi istalaganimizdek sayt yaratdi." },
            { name: "Malika A.", role: "Marketing Director", avatar: "MA", text: "Ular nafaqat dizayn, balki marketing va biznes jarayonlarini ham tushunishadi. Natijalarimiz sezilarli darajada oshdi." },
            { name: "Jasur M.", role: "Founder, Tech Solutions", avatar: "JM", text: "AI yechumlari bo'yicha professional yondashuv. Avtomatlashtirish bizning jarayonlarimizni tejashimizga yordam berdi." },
          ].map((t) => (
            <motion.div key={t.name} variants={fadeUp}
              style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: OG,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13, color: "#fff",
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t.role}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 14 }}>{t.text}</p>
              <div style={{ display: "flex", gap: 3 }}>
                {[0,1,2,3,4].map((i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={OG}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── CONTACT CTA ── */}
      <Section style={{ textAlign: "center", background: "#0d0e16" }}>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{
            borderRadius: 24, background: "rgba(255,106,26,0.06)",
            border: `1px solid rgba(255,106,26,0.15)`, padding: "60px 40px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: OG, textTransform: "uppercase", marginBottom: 16 }}>Aloqa</div>
          <h2 style={{ fontSize: "clamp(24px,4vw,42px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 14, lineHeight: 1.15 }}>
            Loyihangizni boshlashga<br /><Accent>tayyormisiz?</Accent>
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Biz sizning biznesingiz uchun eng yaxshi yechimni birga yaratishga tayyormiz.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <button
              onClick={() => setOrderOpen(true)}
              style={{
                background: OG, border: "none", borderRadius: 24, padding: "14px 28px",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
              }}
            >
              Buyurtma berish →
            </button>
            <a
              href={`https://t.me/${SADIPRIME.telegram}`}
              target="_blank" rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: `1px solid ${BORDER}`, borderRadius: 24, padding: "14px 24px",
                color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: 15, textDecoration: "none",
              }}
            >
              Telegramda yozish
            </a>
          </div>

          {/* Contact info */}
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: SADIPRIME.phone, icon: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" },
              { label: SADIPRIME.email, icon: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" },
              { label: SADIPRIME.location, icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
            ].map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={OG}>
                  <path d={c.icon} />
                </svg>
                {c.label}
              </div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "40px 40px 28px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 32 }} className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: OG, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#fff" }}>SP</div>
              <span style={{ fontWeight: 800, fontSize: 14 }}>SADIPRIME</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 240 }}>
              Raqamli yechimlar orqali biznesingizni keyingi bosqichga olib chiqamiz.
            </p>
          </div>
          {[
            { title: "Xizmatlar", links: ["Veb-saytlar", "Telegram Mini App", "AI Yechimlar", "Avtomatlashtirish", "Marketing"] },
            { title: "Kompaniya", links: ["Biz haqimizda", "Portfolio", "Jarayon", "Narxlar", "Blog"] },
            { title: "Aloqa", links: [SADIPRIME.phone, SADIPRIME.email, `@${SADIPRIME.telegram}`, SADIPRIME.location] },
          ].map((col) => (
            <div key={col.title}>
              <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>{col.title}</div>
              {col.links.map((l) => (
                <div key={l} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            © {new Date().getFullYear()} SADIPRIME. Barcha huquqlar himoyalangan.
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Made with ♥ in Uzbekistan</span>
        </div>
      </footer>

      {/* ── ORDER MODAL ── */}
      <AnimatePresence>
        {orderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setOrderOpen(false); setOrderSent(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                zIndex: 201, width: "min(480px, 94vw)", background: "#111218",
                borderRadius: 20, border: `1px solid ${BORDER}`, padding: "32px",
              }}
            >
              {orderSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Yuborildi!</h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                    Zakaringiz qabul qilindi. Tez orada siz bilan bog&apos;lanamiz.
                  </p>
                  <button
                    onClick={() => { setOrderOpen(false); setOrderSent(false); }}
                    style={{ marginTop: 24, background: OG, border: "none", borderRadius: 16, padding: "12px 28px", color: "#fff", fontWeight: 700, cursor: "pointer" }}
                  >
                    Yopish
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800 }}>Buyurtma berish</h3>
                    <button onClick={() => setOrderOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 20 }}>✕</button>
                  </div>
                  <form onSubmit={sendOrder} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Ism Familiya *</label>
                      <input
                        value={orderName} onChange={(e) => setOrderName(e.target.value)} required
                        placeholder="Ismingizni kiriting"
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Xizmat turi</label>
                      <select
                        value={orderService} onChange={(e) => setOrderService(e.target.value)}
                        style={{ width: "100%", background: "#1a1b24", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
                      >
                        <option value="">Xizmat turini tanlang</option>
                        {SERVICES.map((s) => <option key={s.title} value={s.title}>{s.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Xabar *</label>
                      <textarea
                        value={orderMsg} onChange={(e) => setOrderMsg(e.target.value)} required rows={4}
                        placeholder="Loyihangiz haqida qisqacha yozing..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, resize: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <button
                      type="submit" disabled={orderLoading}
                      style={{ background: OG, border: "none", borderRadius: 14, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: orderLoading ? 0.7 : 1 }}
                    >
                      {orderLoading ? "Yuborilmoqda..." : "Yuborish →"}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: block !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .portfolio-grid { grid-template-columns: 1fr !important; }
          .process-grid { grid-template-columns: 1fr !important; }
          .why-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        input:focus, textarea:focus, select:focus { outline: 1px solid ${OG}; outline-offset: -1px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { color: inherit; }
      `}</style>
    </div>
  );
}

/* ── Helper Components ── */
function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ padding: "80px 40px", ...style }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
      style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: OG, textTransform: "uppercase", marginBottom: 12 }}
    >
      {children}
    </motion.p>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.h2
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
      style={{ fontSize: "clamp(24px,3.5vw,40px)", fontWeight: 900, letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 14, ...style }}
    >
      {children}
    </motion.h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
      style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 560 }}
    >
      {children}
    </motion.p>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: OG }}>{children}</span>;
}

/* ── Hero 3D Graphic ── */
function HeroGraphic() {
  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "relative", width: 320, height: 320 }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,106,26,0.25) 0%, transparent 70%)`,
      }} />
      {/* Main shape */}
      <svg viewBox="0 0 200 200" width="320" height="320" style={{ filter: "drop-shadow(0 0 40px rgba(255,106,26,0.4))" }}>
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={OG2} />
            <stop offset="100%" stopColor="#c0390a" />
          </linearGradient>
          <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        {/* SP logo shape */}
        <path d="M100 20 L160 60 L160 140 L100 180 L40 140 L40 60 Z" fill="url(#g1)" opacity="0.9" />
        <path d="M100 20 L160 60 L100 100 L40 60 Z" fill="url(#g2)" opacity="0.6" />
        <path d="M100 100 L160 60 L160 140 L100 180 Z" fill="rgba(0,0,0,0.3)" />
        <text x="100" y="112" textAnchor="middle" fill="#fff" fontWeight="900" fontSize="42" fontFamily="system-ui" letterSpacing="-2">SP</text>
        {/* Floating orbs */}
        <circle cx="30" cy="50" r="8" fill="rgba(255,106,26,0.6)" />
        <circle cx="170" cy="160" r="12" fill="rgba(255,106,26,0.4)" />
        <circle cx="165" cy="40" r="6" fill="rgba(255,255,255,0.3)" />
        <circle cx="35" cy="155" r="5" fill="rgba(255,106,26,0.5)" />
      </svg>
    </motion.div>
  );
}

/* ── Crown Graphic ── */
function CrownGraphic() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotateZ: [0, 2, 0, -2, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "relative" }}
    >
      <svg viewBox="0 0 200 160" width="300" height="240" style={{ filter: "drop-shadow(0 20px 60px rgba(255,106,26,0.5))" }}>
        <defs>
          <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={OG2} />
            <stop offset="100%" stopColor="#c0390a" />
          </linearGradient>
          <linearGradient id="cg2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        {/* Base */}
        <ellipse cx="100" cy="140" rx="80" ry="14" fill="rgba(255,106,26,0.2)" />
        {/* Crown body */}
        <path d="M30 120 L30 70 L60 90 L100 30 L140 90 L170 70 L170 120 Z" fill="url(#cg1)" />
        <path d="M30 70 L60 90 L100 30 L140 90 L170 70 L155 70 L130 85 L100 40 L70 85 L45 70 Z" fill="url(#cg2)" opacity="0.5" />
        {/* Gems */}
        <circle cx="100" cy="30" r="10" fill="#fff" opacity="0.9" />
        <circle cx="100" cy="30" r="6" fill={OG2} />
        <circle cx="60" cy="90" r="7" fill="#fff" opacity="0.8" />
        <circle cx="140" cy="90" r="7" fill="#fff" opacity="0.8" />
        {/* Shine */}
        <path d="M50 100 Q80 80 100 70 Q120 80 150 100" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
      </svg>
    </motion.div>
  );
}
