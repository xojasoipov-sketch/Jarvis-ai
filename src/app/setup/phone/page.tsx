"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TERMUX_FDROID = "https://f-droid.org/en/packages/com.termux/";
const TERMUX_INTENT = "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.termux;end";

type Step = "loading" | "ready" | "copied" | "done" | "error";

function PhoneSetupInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("loading");
  const [deviceName, setDeviceName] = useState("Android");
  const [deviceId, setDeviceId] = useState("");
  const [installCmd, setInstallCmd] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const register = useCallback(async (server: string, id: string) => {
    try {
      await fetch(`${server}/api/phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Telefon (${new Date().toLocaleDateString("uz-UZ")})`,
          device_id: id,
          webhook_url: `${server}/api/phones/webhook?device_id=${id}`,
          type: "android",
          status: "online",
        }),
      });
    } catch {
      // silent — device may already exist
    }
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) setDeviceName("iPhone");
    else if (/iPad/.test(ua)) setDeviceName("iPad");
    else if (/Android/.test(ua)) {
      const m = ua.match(/;\s*([^;)]+)\s+Build/);
      setDeviceName(m?.[1] ?? "Android");
    }

    const server = window.location.origin;
    const id = searchParams.get("device_id") || crypto.randomUUID();
    const pairingToken = searchParams.get("token");

    setDeviceId(id);

    // Yangi QR pairing tizimi (Device Manager "Add Device") — pairing tokeni bor bo'lsa
    // xavfsiz device_token oluvchi Python agentga yo'naltiramiz.
    if (pairingToken) {
      const cmd = `pkg install -y python termux-api && pip install requests && curl -sL "${server}/pari_device_agent.py" -o pari_device_agent.py && python pari_device_agent.py --server "${server}" --device-id "${id}" --token "${pairingToken}"`;
      setInstallCmd(cmd);
      setStep("ready");
      return;
    }

    // Eski /qr (Telegram bot) oqimi — orqaga moslik uchun saqlanadi
    const cmd = `curl -sL "${server}/pari-agent.sh" | bash -s "${server}" "${id}"`;
    setInstallCmd(cmd);
    register(server, id).then(() => setStep("ready")).catch(() => {
      setErrorMsg("Server bilan bog'lanishda muammo");
      setStep("error");
    });
  }, [searchParams, register]);

  async function handleConnect() {
    try {
      await navigator.clipboard.writeText(installCmd);
    } catch { /* ignore */ }
    setStep("copied");
    setTimeout(() => {
      window.location.href = TERMUX_INTENT;
    }, 700);
  }

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    boxSizing: "border-box",
  };

  const btn = (accent = true): React.CSSProperties => ({
    width: "100%",
    padding: "17px 20px",
    background: accent ? "#ff6a1a" : "rgba(255,255,255,0.05)",
    border: accent ? "none" : "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    color: accent ? "#fff" : "rgba(255,255,255,0.55)",
    fontSize: 16,
    fontWeight: accent ? 700 : 400,
    cursor: "pointer",
    letterSpacing: "-0.2px",
  });

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
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "#ff6a1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, marginBottom: 16,
      }}>⚡</div>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", textAlign: "center" }}>
        Pari AI
      </h1>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 32px", textAlign: "center" }}>
        {deviceName} — telefon ulash
      </p>

      {step === "loading" && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Tayorlanmoqda...</p>
      )}

      {step === "error" && (
        <div style={{ ...card, borderColor: "rgba(255,80,60,0.3)", textAlign: "center" }}>
          <p style={{ color: "#ff5040", margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {step === "ready" && (
        <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Qurilma ro'yxatdan o'tdi</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                ID: {deviceId.slice(0, 12)}...
              </div>
            </div>
          </div>

          <div style={{ ...card }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Qadamlar
            </p>
            {[
              "Termux (F-Droid) o'rnating",
              "Quyidagi tugmani bosing — buyruq nusxalanadi va Termux ochiladi",
              'Termux da uzoq bosib "Paste" → Enter',
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 6,
                  background: "#ff6a1a", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ ...card, background: "#0e1018" }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Termux buyrug'i
            </p>
            <code style={{ fontSize: 10, color: "#ff8c48", wordBreak: "break-all", lineHeight: 1.7 }}>
              {installCmd}
            </code>
          </div>

          <button onClick={handleConnect} style={btn(true)}>
            Termux ochish va ulash →
          </button>

          <a href={TERMUX_FDROID} style={{
            ...btn(false),
            display: "block",
            textAlign: "center",
            textDecoration: "none",
          }}>
            ↓ Termux yuklab olish (F-Droid)
          </a>
        </div>
      )}

      {step === "copied" && (
        <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: "rgba(255,106,26,0.12)", border: "2px solid #ff6a1a",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, textAlign: "center" }}>
            Termux ochilyapti...
          </h2>
          <div style={{ ...card }}>
            {["Termux ekraniga uzoq bosing (long press)", '"Paste" ni tanlang', "Enter tugmasini bosing"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 6,
                  background: "#ff6a1a", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep("done")} style={btn(false)}>
            ✓ Ishga tushdi
          </button>
        </div>
      )}

      {step === "done" && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ulandi!</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", maxWidth: 270, lineHeight: 1.7, margin: 0 }}>
            Telefon background da ishlayapti. Pari orqali SMS, qo&apos;ng&apos;iroq va boshqa buyruqlar berishingiz mumkin.
          </p>
          <div style={{
            marginTop: 4, padding: "12px 18px",
            background: "rgba(255,106,26,0.07)", border: "1px solid rgba(255,106,26,0.18)",
            borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
          }}>
            🎤 Sinab ko&apos;ring: <em style={{ color: "#ff8c48" }}>&ldquo;Telefonga sms yuvor salom deb&rdquo;</em>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhoneSetupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#0b0d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "system-ui" }}>Yuklanmoqda...</p>
      </div>
    }>
      <PhoneSetupInner />
    </Suspense>
  );
}
