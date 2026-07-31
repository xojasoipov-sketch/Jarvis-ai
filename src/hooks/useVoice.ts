"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  webkitAudioContext?: typeof AudioContext;
};

// Short UI tone: mic on → ascending ping, mic off → descending
function playMicTone(on: boolean) {
  try {
    const w = window as SpeechWindow;
    const AudioCtx = window.AudioContext || w.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(on ? 660 : 880, t);
    osc.frequency.exponentialRampToValueAtTime(on ? 990 : 440, t + 0.09);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.start(t);
    osc.stop(t + 0.13);
    osc.onended = () => ctx.close().catch(() => {});
  } catch { /* ignore */ }
}

// ─── Voice Input ──────────────────────────────────────────────────────────────
export function useVoiceInput(onResult: (text: string) => void, lang = "uz-UZ") {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [useGroq, setUseGroq] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/stt", { method: "POST", body: new FormData() })
      .then((r) => setUseGroq(r.status !== 500))
      .catch(() => setUseGroq(false));
    const w = window as SpeechWindow;
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia || w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stopGroq = useCallback(() => {
    mediaRef.current?.stop();
    setListening(false);
    playMicTone(false);
  }, []);

  const startGroq = useCallback(async () => {
    playMicTone(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType });
    mediaRef.current = rec;

    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 500) return;
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      form.append("lang", lang.split("-")[0]);
      try {
        const res = await fetch("/api/stt", { method: "POST", body: form });
        if (!res.ok) return;
        const data = await res.json();
        if (data.text) onResult(data.text);
      } catch {}
    };
    rec.start(200);
    setListening(true);
  }, [lang, onResult]);

  const toggle = useCallback(() => {
    const hasMedia = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
    if (useGroq && hasMedia) {
      if (listening) { stopGroq(); return; }
      startGroq().catch(() => { setListening(false); playMicTone(false); });
      return;
    }

    // Fallback: Web Speech API
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      playMicTone(false);
      return;
    }

    playMicTone(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      onResult(transcript);
    };
    rec.onerror = () => { setListening(false); playMicTone(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, lang, onResult, useGroq, startGroq, stopGroq]);

  return { listening, supported: supported || useGroq === true, toggle };
}

// ─── Voice Output (ElevenLabs TTS via Web Audio API) ─────────────────────────
export function useVoiceOutput() {
  const [enabled, setEnabled] = useState(false);
  const [supported] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create + unlock AudioContext on user gesture (volume toggle)
  const toggleEnabled = useCallback(() => {
    const next = !enabled;
    if (next && typeof window !== "undefined") {
      const w = window as SpeechWindow;
      const AudioCtx = window.AudioContext || w.webkitAudioContext;
      if (AudioCtx && !audioCtxRef.current) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        ctx.resume().catch(() => {});
        // Silent buffer to fully unlock iOS audio output
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } else if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    }
    setEnabled(next);
  }, [enabled]);

  const speak = useCallback(async (text: string) => {
    if (!enabled) return;
    const clean = text
      .replace(/```[\s\S]*?```/g, " kod bloki ")
      .replace(/[*_#`~]/g, "")
      .replace(/\n+/g, ". ")
      .trim()
      .slice(0, 500);
    if (!clean) return;

    // Stop previous audio
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;

    const lang = /[а-яёА-ЯЁ]/.test(clean) ? "ru" : "uz";
    const url = `/api/tts?text=${encodeURIComponent(clean)}&lang=${lang}`;

    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== "closed") {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          if (ctx.state === "suspended") await ctx.resume();
          const src = ctx.createBufferSource();
          src.buffer = decoded;
          src.connect(ctx.destination);
          sourceRef.current = src;
          src.start(0);
          return;
        }
      } catch (e) {
        console.warn("ElevenLabs TTS Web Audio failed:", e);
      }
    }

    // Fallback: speechSynthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = /[а-яёА-ЯЁ]/.test(clean) ? "ru-RU" : "";
      window.speechSynthesis.speak(utter);
    }
  }, [enabled]);

  const stop = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { enabled, setEnabled: toggleEnabled, supported, speak, stop };
}
