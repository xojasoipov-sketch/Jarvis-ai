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

function detectLang(text: string): "ru" | "uz" {
  return /[а-яёА-ЯЁ]/.test(text) ? "ru" : "uz";
}

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
  } catch {
    /* ignore */
  }
}

function splitClientSentences(text: string, maxLen = 280): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).trim().length > maxLen && buf) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [clean.slice(0, maxLen)];
}

async function playMpegBlob(blob: Blob, audioElRef: { current: HTMLAudioElement | null }) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audioElRef.current = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("audio element error"));
    };
    audio.play().catch(reject);
  });
}

/** Faqat server TTS — brauzer Google/speechSynthesis YO'Q */
async function fetchTtsBlob(text: string, lang: string): Promise<{ blob: Blob; provider: string }> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang, stream: false }),
  });

  const provider = res.headers.get("X-TTS-Provider") || "unknown";
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    let detail = `tts ${res.status}`;
    if (ct.includes("json")) {
      const j = await res.json().catch(() => ({}));
      detail = j.detail || j.error || detail;
      if (j.elevenlabs) detail += ` | ${j.elevenlabs}`;
    }
    throw new Error(detail);
  }

  if (ct.includes("json")) {
    throw new Error("tts returned json, not audio");
  }

  const blob = await res.blob();
  if (blob.size < 100) throw new Error("empty audio");
  return { blob, provider };
}

export function useVoiceInput(onResult: (text: string) => void, lang = "uz-UZ") {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [useServerStt, setUseServerStt] = useState(true);

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    // Server STT (Groq/Eleven) — brauzer Google STT ishlatilmaydi
    setUseServerStt(true);
  }, []);

  const stopRec = useCallback(() => {
    mediaRef.current?.stop();
    setListening(false);
    playMicTone(false);
  }, []);

  const startServerStt = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType });
    mediaRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const fd = new FormData();
      // muhim: server "file" va "audio" ni qabul qiladi
      fd.append("file", blob, "audio.webm");
      try {
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        const data = await res.json();
        if (data.text) onResult(data.text);
        else console.warn("STT:", data.error || data.detail || data);
      } catch (e) {
        console.warn("STT network", e);
      }
    };
    rec.start();
    setListening(true);
    playMicTone(true);
  }, [onResult]);

  const toggle = useCallback(() => {
    if (listening) {
      stopRec();
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (useServerStt) {
      startServerStt().catch((e) => {
        console.warn(e);
        setListening(false);
      });
      return;
    }
    // fallback faqat server STT yo'q bo'lsa
    const w = window as SpeechWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[e.resultIndex]?.[0]?.transcript;
      if (t) onResult(t);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    playMicTone(true);
  }, [listening, lang, onResult, startServerStt, stopRec, useServerStt]);

  return { listening, supported: supported || useServerStt, toggle };
}

/** ElevenLabs-only TTS — brauzer Google ovozi O'CHIRILGAN */
export function useVoiceOutput() {
  const [enabled, setEnabled] = useState(false);
  const [supported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;
      const clean = text
        .replace(/```[\s\S]*?```/g, " kod bloki ")
        .replace(/[*_#`~]/g, "")
        .replace(/\n+/g, ". ")
        .trim()
        .slice(0, 4000);
      if (!clean) return;

      stop();
      cancelledRef.current = false;
      setSpeaking(true);
      setLastError(null);

      const lang = detectLang(clean);
      const chunks = splitClientSentences(clean);

      try {
        for (const chunk of chunks) {
          if (cancelledRef.current) break;
          try {
            const { blob, provider } = await fetchTtsBlob(chunk, lang);
            setLastProvider(provider);
            if (provider !== "elevenlabs" && provider !== "elevenlabs-stream") {
              console.warn("TTS provider:", provider, "— ElevenLabs emas");
            }
            if (cancelledRef.current) break;
            await playMpegBlob(blob, audioElRef);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("TTS xato (Google fallback YO'Q):", msg);
            setLastError(msg);
            // Brauzer speechSynthesis ISHLATILMAYDI — Google ovoziga o'xshamasin
            break;
          }
        }
      } finally {
        setSpeaking(false);
      }
    },
    [enabled, stop]
  );

  return {
    enabled,
    setEnabled: toggleEnabled,
    supported,
    speak,
    stop,
    speaking,
    lastError,
    lastProvider,
  };
}
