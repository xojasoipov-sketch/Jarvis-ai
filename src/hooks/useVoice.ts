"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in default TS DOM lib)
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
};

// Neural/premium voice preferred, then lang match
function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const score = (v: SpeechSynthesisVoice, target: string) => {
    let s = 0;
    const n = v.name.toLowerCase();
    if (/neural|premium|enhanced|wavenet|journey|studio/.test(n)) s += 30;
    if (v.lang === target) s += 100;
    else if (v.lang.startsWith(target.split("-")[0])) s += 50;
    if (v.localService) s += 5;
    return s;
  };

  const candidates = ["uz-UZ", "ru-RU", "en-US"].map((l) => lang === l ? lang : l);
  const pool = [lang, ...candidates];

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const target of pool) {
    for (const v of voices) {
      const s = score(v, target);
      if (s > bestScore) { bestScore = s; best = v; }
    }
    if (best && best.lang.startsWith(target.split("-")[0])) break;
  }
  return best;
}

// ─── Voice Input ──────────────────────────────────────────────────────────────
// Tries Groq Whisper via /api/stt; falls back to Web Speech API if needed

export function useVoiceInput(onResult: (text: string) => void, lang = "uz-UZ") {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [useGroq, setUseGroq] = useState<boolean | null>(null);

  useEffect(() => {
    // Test if /api/stt is reachable (GROQ_API_KEY set)
    fetch("/api/stt", { method: "POST", body: new FormData() })
      .then((r) => setUseGroq(r.status !== 500))
      .catch(() => setUseGroq(false));
    const w = window as SpeechWindow;
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia || w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stopGroq = useCallback(() => {
    mediaRef.current?.stop();
    setListening(false);
  }, []);

  const startGroq = useCallback(async () => {
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
      startGroq().catch(() => setListening(false));
      return;
    }

    // Fallback: Web Speech API
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      onResult(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, lang, onResult, useGroq, startGroq, stopGroq]);

  return { listening, supported: supported || useGroq === true, toggle };
}

// ─── Voice Output ─────────────────────────────────────────────────────────────
export function useVoiceOutput() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Warm up voice list
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
    }
  }, []);

  const speak = useCallback(
    (text: string, lang = "uz-UZ") => {
      if (!enabled || !supported) return;
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, " kod bloki ").replace(/[*_#`~]/g, "").replace(/\n+/g, ". ").trim();
      if (!clean) return;

      const utter = new SpeechSynthesisUtterance(clean.slice(0, 3000));
      const voice = pickBestVoice(lang);
      if (voice) { utter.voice = voice; utter.lang = voice.lang; }
      else utter.lang = lang;
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    },
    [enabled, supported]
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { enabled, setEnabled, supported, speak, stop };
}
