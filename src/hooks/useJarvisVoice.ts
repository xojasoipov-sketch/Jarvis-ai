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
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

const WAKE_WORDS = ["pari", "пари", "hey pari", "salom pari"];

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

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const target of [lang, "uz-UZ", "ru-RU", "en-US"]) {
    for (const v of voices) {
      const s = score(v, target);
      if (s > bestScore) { bestScore = s; best = v; }
    }
    if (best && best.lang.startsWith(target.split("-")[0])) break;
  }
  return best;
}

async function transcribeWithGroq(blob: Blob, lang: string): Promise<string | null> {
  const form = new FormData();
  form.append("audio", blob, "audio.webm");
  form.append("lang", lang.split("-")[0]);
  try {
    const res = await fetch("/api/stt", { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch {
    return null;
  }
}

export function useJarvisVoice(onCommand: (text: string) => Promise<string>) {
  const [state, setState] = useState<JarvisState>("asleep");
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const stateRef = useRef<JarvisState>("asleep");
  const alwaysOnRef = useRef(false);
  const speechLang = useRef("ru-RU");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { alwaysOnRef.current = alwaysOn; }, [alwaysOn]);

  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition || navigator.mediaDevices?.getUserMedia));
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, " kod bloki ").replace(/[*_#`~]/g, "").replace(/\n+/g, ". ").trim();
      if (!clean) return resolve();
      const utter = new SpeechSynthesisUtterance(clean.slice(0, 3000));
      const voice = pickBestVoice("uz-UZ");
      if (voice) { utter.voice = voice; utter.lang = voice.lang; }
      else utter.lang = "uz-UZ";
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }, []);

  const captureCommandGroq = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size < 500) { setState("asleep"); return; }
      setState("thinking");
      const text = await transcribeWithGroq(blob, "uz-UZ");
      if (!text) { setState("asleep"); if (alwaysOnRef.current) startWakeListening(); return; }
      setTranscript(text);
      const answer = await onCommand(text);
      setReply(answer);
      setState("speaking");
      await speak(answer);
      setState("asleep");
      if (alwaysOnRef.current) startWakeListening();
    };
    rec.start(200);
    // Auto-stop after 8 seconds
    setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 8000);
    setState("listening");

    // Also stop on silence via Web Speech if available
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Ctor) {
      const sr = new Ctor();
      sr.lang = speechLang.current;
      sr.continuous = false;
      sr.interimResults = false;
      sr.onresult = () => { if (rec.state === "recording") rec.stop(); };
      sr.onerror = () => { if (rec.state === "recording") rec.stop(); };
      sr.onend = () => { if (rec.state === "recording") rec.stop(); };
      try { sr.start(); } catch {}
    }
  }, [onCommand, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  const captureCommandSpeech = useCallback(() => {
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = speechLang.current;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = async (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      setTranscript(text);
      setState("thinking");
      const answer = await onCommand(text);
      setReply(answer);
      setState("speaking");
      await speak(answer);
      setState("asleep");
      if (alwaysOnRef.current) startWakeListening();
    };
    rec.onerror = () => { setState("asleep"); if (alwaysOnRef.current) startWakeListening(); };
    rec.onend = () => {};
    recRef.current = rec;
    try { rec.start(); } catch {}
  }, [onCommand, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  const startWakeListening = useCallback(() => {
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = speechLang.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript.toLowerCase();
      if (WAKE_WORDS.some((w) => text.includes(w))) {
        rec.stop();
        wake();
      }
    };
    rec.onend = () => {
      if (alwaysOnRef.current && stateRef.current === "asleep") {
        try { rec.start(); } catch {}
      }
    };
    rec.onerror = () => {
      if (alwaysOnRef.current && stateRef.current === "asleep") {
        setTimeout(() => { try { rec.start(); } catch {} }, 1000);
      }
    };
    recRef.current = rec;
    try { rec.start(); } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wake = useCallback(() => {
    setState("waking");
    setTranscript("");
    setReply("");
    setTimeout(() => {
      const hasMedia = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
      if (hasMedia) {
        captureCommandGroq().catch(() => {
          setState("listening");
          captureCommandSpeech();
        });
      } else {
        setState("listening");
        captureCommandSpeech();
      }
    }, 300);
  }, [captureCommandGroq, captureCommandSpeech]);

  const toggleAlwaysOn = useCallback(() => {
    setAlwaysOn((prev) => {
      const next = !prev;
      if (next) startWakeListening();
      else recRef.current?.stop();
      return next;
    });
  }, [startWakeListening]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { state, alwaysOn, supported, transcript, reply, toggleAlwaysOn, wake };
}
