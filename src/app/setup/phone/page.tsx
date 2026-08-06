"use client";
import { useEffect, useState } from "react";

const SERVER = "https://jarvis-ai-production-41a9.up.railway.app";

function genId() {
  const stored = typeof localStorage !== "undefined" && localStorage.getItem("pari_device_id");
  if (stored) return stored;
  const id = "ph_" + Math.random().toString(36).slice(2, 10);
  if (typeof localStorage !== "undefined") localStorage.setItem("pari_device_id", id);
  return id;
}

export default function PhoneSetupPage() {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"idle" | "registering" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = genId();
    setDeviceId(id);
    // Auto-detect device name
    const ua = navigator.userAgent;
    const detected = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android Tel" : "Qurilma";
    setName(detected);
  }, []);

  async function register() {
    if (!deviceId || !name) return;
    setStep("registering");
    try {
      const res = await fetch(`${SERVER}/api/phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deviceId,
          name,
          platform: /iPhone|iPad/.test(navigator.userAgent) ? "ios" : "android",
          webhook_url: "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const pollUrl = `${SERVER}/api/phones?action=poll&device_id=${deviceId}`;

  return (
    <div style={{
      minHeight: "100dvh", background: "#0b0d14", color: "#fff",
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "40px 20px", boxSizing: "border-box",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: "#ff6a1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", fontSize: 22,
        }}>⚡</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pari AI</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>Telefonni ulash</p>
      </div>

      {step !== "done" ? (
        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Device name */}
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Qurilma nomi
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mening telefon"
            style={{
              display: "block", width: "100%", marginTop: 6, marginBottom: 20,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,106,26,0.25)",
              borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#fff",
              boxSizing: "border-box", outline: "none",
            }}
          />

          <button
            onClick={register}
            disabled={step === "registering" || !name}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: step === "registering" ? "rgba(255,106,26,0.4)" : "#ff6a1a",
              color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {step === "registering" ? "Ulanmoqda..." : "✓ Pari ga ulash"}
          </button>

          {step === "error" && (
            <p style={{ color: "#f87171", fontSize: 13, marginTop: 12, textAlign: "center" }}>
              Xato: {error}. Internet aloqasini tekshiring.
            </p>
          )}

          <div style={{
            marginTop: 28, padding: 14, borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Qurilma ID
            </p>
            <code style={{ fontSize: 12, color: "#ff6a1a", wordBreak: "break-all" }}>{deviceId}</code>
          </div>
        </div>
      ) : (
        /* Success state */
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ulandi!</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>
            {name} muvaffaqiyatli ro&apos;yxatdan o&apos;tdi
          </p>

          {/* Tasker poll URL */}
          <div style={{
            textAlign: "left", padding: 14, borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,106,26,0.2)",
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Tasker polling URL
            </p>
            <code style={{ fontSize: 11, color: "#ff6a1a", wordBreak: "break-all", lineHeight: 1.6 }}>
              {pollUrl}
            </code>
          </div>

          <a
            href={`data:application/xml;charset=utf-8,${encodeURIComponent(generateTaskerXML(deviceId, name, SERVER))}`}
            download="pari-tasker.xml"
            style={{
              display: "block", padding: "13px", borderRadius: 12,
              background: "#ff6a1a", color: "#fff", textDecoration: "none",
              fontSize: 15, fontWeight: 600, marginBottom: 12,
            }}
          >
            ↓ Tasker XML yuklab olish
          </a>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            Yuklab olingan faylni Tasker → ☰ → Import → Local Backup orqali import qiling
          </p>
        </div>
      )}
    </div>
  );
}

function generateTaskerXML(deviceId: string, deviceName: string, server: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<TaskerData sr="" dvi="1" tv="6.3.13">

<Profile sr="prof0" ve="2">
  <cdate>1720000000000</cdate>
  <edate>1720000000000</edate>
  <id>1</id>
  <mid0>1</mid0>
  <nme>Pari - Poll</nme>
  <Time sr="con0">
    <rep>1</rep>
    <repval>10</repval>
  </Time>
</Profile>

<Task sr="task1">
  <cdate>1720000000000</cdate>
  <edate>1720000000000</edate>
  <id>1</id>
  <nme>Pari Poll Commands</nme>

  <Action sr="act0" ve="7">
    <code>339</code>
    <Str sr="arg0" ve="3">GET</Str>
    <Str sr="arg1" ve="3">${server}/api/phones?action=poll&amp;device_id=${deviceId}</Str>
    <Str sr="arg2" ve="3"></Str>
    <Str sr="arg3" ve="3">%pari_resp</Str>
    <Int sr="arg4" val="0"/>
    <Int sr="arg5" val="30"/>
  </Action>

  <Action sr="act1" ve="7">
    <code>547</code>
    <Str sr="arg0" ve="3">%pari_resp</Str>
    <Str sr="arg1" ve="3">commands</Str>
    <Str sr="arg2" ve="3">%cmds</Str>
  </Action>

  <Action sr="act2" ve="7">
    <code>547</code>
    <Str sr="arg0" ve="3">%cmds(1)</Str>
    <Str sr="arg1" ve="3">action</Str>
    <Str sr="arg2" ve="3">%cmd_action</Str>
  </Action>

  <Action sr="act3" ve="7">
    <code>547</code>
    <Str sr="arg0" ve="3">%cmds(1)</Str>
    <Str sr="arg1" ve="3">payload/number</Str>
    <Str sr="arg2" ve="3">%cmd_number</Str>
  </Action>

  <Action sr="act4" ve="7">
    <code>547</code>
    <Str sr="arg0" ve="3">%cmds(1)</Str>
    <Str sr="arg1" ve="3">payload/message</Str>
    <Str sr="arg2" ve="3">%cmd_message</Str>
  </Action>

  <Action sr="act5" ve="7">
    <code>547</code>
    <Str sr="arg0" ve="3">%cmds(1)</Str>
    <Str sr="arg1" ve="3">payload/title</Str>
    <Str sr="arg2" ve="3">%cmd_title</Str>
  </Action>

  <!-- SMS -->
  <Action sr="act6" ve="7">
    <code>130</code>
    <Str sr="arg0" ve="3">%cmd_number</Str>
    <Str sr="arg1" ve="3">%cmd_message</Str>
    <Int sr="arg2" val="0"/>
    <cond>
      <code>6</code>
      <Str sr="arg0" ve="3">%cmd_action</Str>
      <Str sr="arg1" ve="3">sms</Str>
    </cond>
  </Action>

  <!-- Call -->
  <Action sr="act7" ve="7">
    <code>126</code>
    <Str sr="arg0" ve="3">%cmd_number</Str>
    <cond>
      <code>6</code>
      <Str sr="arg0" ve="3">%cmd_action</Str>
      <Str sr="arg1" ve="3">call</Str>
    </cond>
  </Action>

  <!-- Notification -->
  <Action sr="act8" ve="7">
    <code>853</code>
    <Str sr="arg0" ve="3">%cmd_title</Str>
    <Str sr="arg1" ve="3">%cmd_message</Str>
    <cond>
      <code>6</code>
      <Str sr="arg0" ve="3">%cmd_action</Str>
      <Str sr="arg1" ve="3">notify</Str>
    </cond>
  </Action>

</Task>

<Project sr="proj0" ve="2">
  <name>Pari AI - ${deviceName}</name>
  <ProfileIds sr="ProfileIds">
    <ProfileId sr="prof0_0">1</ProfileId>
  </ProfileIds>
  <TaskIds sr="TaskIds">
    <TaskId sr="task1_0">1</TaskId>
  </TaskIds>
</Project>

</TaskerData>`;
}
