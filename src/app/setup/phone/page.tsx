"use client";
import { useEffect, useState } from "react";

const SERVER = "https://jarvis-ai-production-41a9.up.railway.app";
const INSTALL_CMD = `curl -sS ${SERVER}/pari-agent.sh | bash`;

// Termux intent — opens Termux app on Android
const TERMUX_INTENT = "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.termux;end";
// Termux F-Droid link
const TERMUX_FDROID = "https://f-droid.org/en/packages/com.termux/";

type Step = "start" | "copied" | "done";

export default function PhoneSetupPage() {
  const [step, setStep] = useState<Step>("start");
  const [deviceName, setDeviceName] = useState("Android");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) setDeviceName("iPhone");
    else if (/iPad/.test(ua)) setDeviceName("iPad");
    else if (/Android/.test(ua)) {
      const m = ua.match(/;\s*([^;)]+)\s+Build/);
      setDeviceName(m?.[1] ?? "Android");
    }
  }, []);

  async function handleMain() {
    // 1. Copy command to clipboard
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      // fallback: select text
    }
    setStep("copied");

    // 2. Small delay then open Termux
    setTimeout(() => {
      window.location.href = TERMUX_INTENT;
    }, 600);
  }

  function handleDone() {
    setStep("done");
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0b0d14",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      boxSizing: "border-box",
      gap: 0,
    }}>

      {/* Logo */}
      <div style={{
        width: 60, height: 60, borderRadius: 16,
        background: "#ff6a1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, marginBottom: 20,
      }}>⚡</div>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
        Pari AI
      </h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 36px", textAlign: "center" }}>
        {deviceName} — avtomatik ulash
      </p>

      {/* ── STEP: start ── */}
      {step === "start" && (
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Main CTA */}
          <button onClick={handleMain} style={{
            width: "100%", padding: "18px 20px",
            background: "#ff6a1a", border: "none", borderRadius: 14,
            color: "#fff", fontSize: 17, fontWeight: 700,
            cursor: "pointer", letterSpacing: "-0.2px",
          }}>
            Termux ochish →
          </button>

          <p style={{
            fontSize: 12, color: "rgba(255,255,255,0.35)",
            textAlign: "center", lineHeight: 1.6, margin: 0,
          }}>
            Termux o&apos;rnatilmagan bo&apos;lsa avval yuklab oling
          </p>

          {/* Termux install link */}
          <a href={TERMUX_FDROID} style={{
            display: "block", width: "100%", padding: "13px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, color: "rgba(255,255,255,0.55)",
            fontSize: 13, textAlign: "center", textDecoration: "none",
            boxSizing: "border-box",
          }}>
            ↓ Termux F-Droid dan yuklash
          </a>
        </div>
      )}

      {/* ── STEP: copied — paste instruction ── */}
      {step === "copied" && (
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>

          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "rgba(255,106,26,0.15)",
            border: "2px solid #ff6a1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>📋</div>

          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, textAlign: "center" }}>
            Termux ochildi
          </h2>

          <div style={{
            background: "rgba(255,106,26,0.08)",
            border: "1px solid rgba(255,106,26,0.25)",
            borderRadius: 12, padding: "16px",
            width: "100%", boxSizing: "border-box",
          }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Termux da qiling:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Termux ekraniga uzoq bosing (long press)", "\"Paste\" ni tanlang", "Enter tugmasini bosing"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{
                    minWidth: 22, height: 22, borderRadius: 7,
                    background: "#ff6a1a", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Command preview */}
          <div style={{
            background: "#0f1018", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "10px 14px",
            width: "100%", boxSizing: "border-box",
          }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Clipboard da saqlanган buyruq:
            </p>
            <code style={{ fontSize: 11, color: "#ff8c48", wordBreak: "break-all", lineHeight: 1.6 }}>
              {INSTALL_CMD}
            </code>
          </div>

          <button onClick={handleDone} style={{
            width: "100%", padding: "14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, color: "rgba(255,255,255,0.6)",
            fontSize: 14, cursor: "pointer",
          }}>
            ✓ Ishga tushdi
          </button>
        </div>
      )}

      {/* ── STEP: done ── */}
      {step === "done" && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ulandi!</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", maxWidth: 260, lineHeight: 1.6, margin: 0 }}>
            Telefon background da ishlayapti. Pari orqali SMS, qo&apos;ng&apos;iroq va boshqa buyruqlar berishingiz mumkin.
          </p>
          <div style={{
            marginTop: 8,
            padding: "12px 20px",
            background: "rgba(255,106,26,0.08)",
            border: "1px solid rgba(255,106,26,0.2)",
            borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
          }}>
            🎤 Sinab ko&apos;ring: <em style={{ color: "#ff8c48" }}>&ldquo;Telefonga sms yuvor salom deb&rdquo;</em>
          </div>
        </div>
      )}
    </div>
  );
}
