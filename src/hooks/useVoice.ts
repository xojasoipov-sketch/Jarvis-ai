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

/** Fetch TTS — stream preferred, buffer fallback */
async function fetchTtsBlob(text: string, lang: string, preferStream: boolean): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang, stream: preferStream }),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = `tts ${res.status}`;
    if (ct.includes("json")) {
      const j = await res.json().catch(() => ({}));
      msg = j.error || j.hint || msg;
    }
    throw new Error(msg);
  }

  if (ct.includes("json")) {
    throw new Error("tts returned json, not audio");
  }

  return res.blob();
}

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
    setSupported(
      Boolean(
        navigator.mediaDevices?.getUserMedia ||
          w.SpeechRecognition ||
          w.webkitSpeechRecognition
      )
    );
  }, []);

  const stopGroq = useCallback(() => {
    mediaRef.current?.stop();
    setListening(false);
    playMicTone(false);
  }, []);

  const startGroq = useCallback(async () => {
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
      fd.append("file", blob, "audio.webm");
      try {
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        const data = await res.json();
        if (data.text) onResult(data.text);
      } catch {
        /* ignore */
      }
    };
    rec.start();
    setListening(true);
    playMicTone(true);
  }, [onResult]);

  const toggle = useCallback(() => {
    if (listening) {
      if (mediaRef.current) stopGroq();
      else recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (useGroq) {
      startGroq().catch(() => setListening(false));
      return;
    }
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
  }, [listening, lang, onResult, startGroq, stopGroq, useGroq]);

  return { listening, supported: supported || useGroq === true, toggle };
}

/** ElevenLabs TTS — sentence queue + stream/buffer, HTMLAudio (decodeAudioData MPEG xatolaridan qochish) */
export function useVoiceOutput() {
  const [enabled, setEnabled] = useState(false);
  const [supported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
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

      const lang = detectLang(clean);
      const chunks = splitClientSentences(clean);
      queueRef.current = chunks;

      try {
        for (const chunk of chunks) {
          if (cancelledRef.current) break;
          try {
            // Avval stream, xato bo'lsa buffer
            let blob: Blob;
            try {
              blob = await fetchTtsBlob(chunk, lang, true);
            } catch {
              blob = await fetchTtsBlob(chunk, lang, false);
            }
            if (cancelledRef.current) break;
            if (blob.size < 100) throw new Error("empty audio");
            await playMpegBlob(blob, audioElRef);
          } catch (e) {
            console.warn("TTS chunk error:", e);
            // oxirgi chora — speechSynthesis shu chunk uchun
            if ("speechSynthesis" in window && !cancelledRef.current) {
              await new Promise<void>((resolve) => {
                const utter = new SpeechSynthesisUtterance(chunk);
                utter.lang = lang === "ru" ? "ru-RU" : "tr-TR";
                utter.rate = 0.95;
                utter.onend = () => resolve();
                utter.onerror = () => resolve();
                window.speechSynthesis.speak(utter);
              });
            }
          }
        }
      } finally {
        setSpeaking(false);
      }
    },
    [enabled, stop]
  );

  return { enabled, setEnabled: toggleEnabled, supported, speak, stop, speaking };
}
