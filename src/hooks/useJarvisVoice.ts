"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

// VAD thresholds — iOS mic gain is lower than desktop
const SPEAK_THRESHOLD = 0.002;
const SILENCE_THRESHOLD = 0.001;
const SILENCE_DURATION = 1500;
const MIN_SPEECH_MS = 300;
const MAX_SPEECH_MS = 15000;

function getBestMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/x-m4a",
    "",
  ];
  for (const t of types) {
    if (!t || MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/** Detect language: Russian → ru, everything else → uz (prefer Uzbek) */
function detectLang(text: string): "ru" | "uz" {
  return /[а-яёА-ЯЁ]/.test(text) ? "ru" : "uz";
}

/** Best speechSynthesis lang for fallback */
function speechSynthLang(lang: "ru" | "uz"): string {
  if (lang === "ru") return "ru-RU";
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.some((v) => v.lang.toLowerCase().startsWith("uz"))) return "uz-UZ";
    if (voices.some((v) => v.lang.toLowerCase().startsWith("tr"))) return "tr-TR";
  }
  return "tr-TR"; // Turkish is phonetically closest to Uzbek
}

// Play TTS via Web Audio API (works on iOS in async context) with speechSynthesis fallback
async function speakText(text: string, audioCtx: AudioContext | null): Promise<void> {
  const clean = text.replace(/[*_#`>~[\]]/g, "").replace(/\n+/g, " ").slice(0, 500);
  if (!clean) return;

  const lang = detectLang(clean);
  const url = `/api/tts?text=${encodeURIComponent(clean)}&lang=${lang}`;

  // Method 1: Web Audio API — only reliable method on iOS in async chains
  if (audioCtx && audioCtx.state !== "closed") {
    try {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buf);
        if (audioCtx.state === "suspended") await audioCtx.resume();
        await new Promise<void>((resolve) => {
          const src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(audioCtx.destination);
          src.onended = () => resolve();
          src.start(0);
        });
        return;
      }
    } catch (e) {
      console.warn("Web Audio TTS failed:", e);
    }
  }

  // Method 2: speechSynthesis with better Uzbek support
  if ("speechSynthesis" in window) {
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = speechSynthLang(lang);
      utter.rate = 0.95;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      utter.onend = finish;
      utter.onerror = finish;
      setTimeout(finish, Math.max(6000, clean.split(/\s+/).length * 450));
      window.speechSynthesis.speak(utter);
    });
  }
}

async function callVoiceAPI(blob: Blob): Promise<{ transcript: string; reply: string }> {
  const fd = new FormData();
  const ext = blob.type.includes("mp4") || blob.type.includes("m4a") ? "mp4"
    : blob.type.includes("ogg") ? "ogg"
    : blob.type.includes("wav") ? "wav"
    : "webm";
  fd.append("audio", blob, `audio.${ext}`);
  try {
    const res = await fetch("/api/voice", { method: "POST", body: fd });
    if (!res.ok) return { transcript: "", reply: "Kechirasiz, xato yuz berdi. Qayta urinib ko'ring." };
    const data = await res.json();
    if (!data.reply) return { transcript: data.transcript || "", reply: "Kechirasiz, tushunmadim. Qayta gapiring." };
    return data;
  } catch {
    return { transcript: "", reply: "Aloqa xatosi. Internetni tekshiring." };
  }
}

export function useJarvisVoice() {
  const [state, setState] = useState<JarvisState>("asleep");
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<JarvisState>("asleep");
  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const vadLoopRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const isSpeakingRef = useRef(false);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const ok =
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      (typeof AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== "undefined");
    setSupported(ok);
  }, []);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(vadLoopRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try { recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    isSpeakingRef.current = false;
    chunksRef.current = [];
    setLevel(0);
  }, []);

  const processChunks = useCallback(async (chunks: BlobPart[], mime: string) => {
    const blob = new Blob(chunks, { type: mime || "audio/webm" });
    if (blob.size < 500) {
      if (activeRef.current) setState("listening");
      return;
    }

    setState("thinking");
    setError(null);
    const { reply } = await callVoiceAPI(blob);

    setState("speaking");
    // Pass audioCtx so Web Audio API is used on iOS
    await speakText(reply, audioCtxRef.current);
    if (activeRef.current) setState("listening");
    else setState("asleep");
  }, []);

  const startVADLoop = useCallback((stream: MediaStream, ctx: AudioContext) => {
    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    ctx.createMediaStreamSource(stream).connect(analyser);

    const mime = getBestMime();
    const data = new Float32Array(analyser.fftSize);

    function startRecording() {
      chunksRef.current = [];
      try {
        const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {};
        const rec = new MediaRecorder(stream, opts);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          const elapsed = Date.now() - speechStartRef.current;
          if (elapsed >= MIN_SPEECH_MS && stateRef.current !== "asleep") {
            processChunks([...chunksRef.current], rec.mimeType || mime);
          } else if (activeRef.current) {
            setState("listening");
          }
        };
        rec.start(250);
      } catch (e) {
        console.error("MediaRecorder error:", e);
        setError("Mikrofon xatosi: " + String(e));
      }
      speechStartRef.current = Date.now();
      isSpeakingRef.current = true;
    }

    function stopRecording() {
      isSpeakingRef.current = false;
      if (recorderRef.current?.state === "recording") {
        try { recorderRef.current.stop(); } catch {}
      }
    }

    function vadTick() {
      if (!activeRef.current) return;
      if (stateRef.current === "thinking" || stateRef.current === "speaking") {
        vadLoopRef.current = requestAnimationFrame(vadTick);
        return;
      }

      analyser.getFloatTimeDomainData(data);
      let rms = 0;
      for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
      rms = Math.sqrt(rms / data.length);
      setLevel(Math.min(rms / 0.08, 1));

      if (!isSpeakingRef.current && rms > SPEAK_THRESHOLD) {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        setState("listening");
        startRecording();
        setTimeout(() => { if (isSpeakingRef.current) stopRecording(); }, MAX_SPEECH_MS);
      } else if (isSpeakingRef.current && rms < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            stopRecording();
          }, SILENCE_DURATION);
        }
      } else if (isSpeakingRef.current && rms > SPEAK_THRESHOLD) {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      }

      vadLoopRef.current = requestAnimationFrame(vadTick);
    }

    vadLoopRef.current = requestAnimationFrame(vadTick);
  }, [processChunks]);

  const startConversation = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    setActive(true);
    setState("waking");

    // Create & resume AudioContext directly in user gesture — this unlocks Web Audio on iOS
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    await ctx.resume().catch(() => {});

    // Play a silent buffer to fully unlock audio output on iOS
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch { /* ignore */ }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      console.error("getUserMedia error:", e);
      setError("Mikrofon ruxsati berilmadi.");
      setActive(false);
      setState("asleep");
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
      return;
    }
    streamRef.current = stream;

    setTimeout(() => {
      if (activeRef.current && audioCtxRef.current) {
        setState("listening");
        startVADLoop(stream, audioCtxRef.current);
      }
    }, 400);
  }, [startVADLoop]);

  const stopConversation = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopAll();
    setActive(false);
    setState("asleep");
  }, [stopAll]);

  const toggle = useCallback(() => {
    if (activeRef.current) stopConversation();
    else startConversation();
  }, [startConversation, stopConversation]);

  useEffect(() => () => stopAll(), [stopAll]);

  return { state, active, supported, level, error, toggle, stopConversation };
}
