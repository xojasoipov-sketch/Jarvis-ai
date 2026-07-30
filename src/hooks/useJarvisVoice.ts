"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

const WAKE_WORDS = ["pari", "hey pari", "salom pari", "пари"];

function getBestMime(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", ""]) {
    if (!t || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t))) return t;
  }
  return "";
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, "").slice(0, 1500);
    const utter = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    utter.voice = voices.find((v) => v.lang.startsWith("uz")) ||
      voices.find((v) => v.lang.startsWith("ru")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;
    utter.lang = utter.voice?.lang || "ru-RU";
    utter.rate = 1.05;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// Send audio to Gemini — one call: STT + AI response
async function callVoice(blob: Blob): Promise<{ transcript: string; reply: string }> {
  const fd = new FormData();
  fd.append("audio", blob, "audio.webm");
  try {
    const res = await fetch("/api/voice", { method: "POST", body: fd });
    if (!res.ok) return { transcript: "", reply: "Server xatosi." };
    return await res.json();
  } catch {
    return { transcript: "", reply: "Ulanish muammosi." };
  }
}

export function useJarvisVoice() {
  const [state, setState] = useState<JarvisState>("asleep");
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [supported, setSupported] = useState(false);
  // Only exposed for typed input fallback display
  const [lastReply, setLastReply] = useState("");

  const stateRef = useRef<JarvisState>("asleep");
  const alwaysOnRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { alwaysOnRef.current = alwaysOn; }, [alwaysOn]);

  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
    // Pre-load voices
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  const killRecorder = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const record = useCallback((maxMs: number): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      let stream: MediaStream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { return reject(e); }
      streamRef.current = stream;

      const mime = getBestMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      recorderRef.current = rec;
      const chunks: BlobPart[] = [];

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: mime || "audio/webm" }));
      };
      rec.onerror = () => reject(new Error("recorder error"));

      rec.start();
      setTimeout(() => { if (rec.state === "recording") rec.stop(); }, maxMs);
    });
  }, []);

  const processAudio = useCallback(async (blob: Blob, checkWake = false) => {
    setState("thinking");
    const { transcript, reply } = await callVoice(blob);

    if (checkWake) {
      const t = transcript.toLowerCase();
      if (!WAKE_WORDS.some((w) => t.includes(w))) {
        setState("asleep");
        if (alwaysOnRef.current) startAlwaysOn();
        return;
      }
      // wake word detected — capture the actual command now
      setState("waking");
      setTimeout(() => captureCommand(), 300);
      return;
    }

    if (!transcript && !reply) { setState("asleep"); return; }

    setState("speaking");
    setLastReply(reply);
    await speakText(reply);
    setState("asleep");
    if (alwaysOnRef.current) startAlwaysOn();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const captureCommand = useCallback(async () => {
    setState("listening");
    try {
      const blob = await record(8000);
      if (stateRef.current === "asleep") return; // cancelled
      await processAudio(blob, false);
    } catch {
      setState("asleep");
      if (alwaysOnRef.current) startAlwaysOn();
    }
  }, [record, processAudio]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAlwaysOn = useCallback(async () => {
    if (!alwaysOnRef.current || stateRef.current !== "asleep") return;
    try {
      const blob = await record(3000);
      if (!alwaysOnRef.current || stateRef.current !== "asleep") return;
      await processAudio(blob, true);
    } catch {
      if (alwaysOnRef.current) setTimeout(() => startAlwaysOn(), 1000);
    }
  }, [record, processAudio]); // eslint-disable-line react-hooks/exhaustive-deps

  const wake = useCallback(() => {
    killRecorder();
    setState("waking");
    setLastReply("");
    setTimeout(() => captureCommand(), 300);
  }, [captureCommand, killRecorder]);

  const stopListening = useCallback(() => {
    killRecorder();
    setState("asleep");
  }, [killRecorder]);

  const toggleAlwaysOn = useCallback(() => {
    setAlwaysOn((prev) => {
      const next = !prev;
      alwaysOnRef.current = next;
      if (next) startAlwaysOn();
      else { killRecorder(); setState("asleep"); }
      return next;
    });
  }, [startAlwaysOn, killRecorder]);

  useEffect(() => () => killRecorder(), [killRecorder]);

  return { state, alwaysOn, supported, lastReply, wake, stopListening, toggleAlwaysOn };
}
