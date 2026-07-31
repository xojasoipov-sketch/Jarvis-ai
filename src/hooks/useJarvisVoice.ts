"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

// VAD thresholds — tuned for mobile (iOS has lower mic gain)
const SPEAK_THRESHOLD = 0.010;   // speech start
const SILENCE_THRESHOLD = 0.006; // silence
const SILENCE_DURATION = 1500;   // ms silence → stop recording
const MIN_SPEECH_MS = 300;       // ignore clips shorter than this
const MAX_SPEECH_MS = 15000;     // max recording length

function getBestMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",        // iOS Safari
    "audio/x-m4a",
    "",                 // browser default
  ];
  for (const t of types) {
    if (!t || MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

let currentAudio: HTMLAudioElement | null = null;

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }

    const clean = text.replace(/[*_#`>~\[\]]/g, "").replace(/\n+/g, " ").slice(0, 500);
    if (!clean) return resolve();

    // Detect language: default to Uzbek, fallback to Russian
    const lang = /[а-яёА-ЯЁ]/.test(clean) ? "ru" : "uz";
    const url = `/api/tts?text=${encodeURIComponent(clean)}&lang=${lang}`;

    const audio = new Audio(url);
    currentAudio = audio;
    audio.volume = 1.0;

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        currentAudio = null;
        resolve();
      }
    };

    audio.onended = done;
    audio.onerror = () => {
      // Fallback to speechSynthesis if TTS proxy fails
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = lang === "uz" ? "uz-UZ" : "ru-RU";
        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
      } else {
        done();
      }
    };

    // Fallback timeout
    const wordCount = clean.split(/\s+/).length;
    setTimeout(done, Math.max(8000, wordCount * 500));

    audio.play().catch(() => {
      // autoplay blocked — trigger speechSynthesis fallback
      audio.onerror?.(new Event("error"));
    });
  });
}

async function callVoiceAPI(blob: Blob): Promise<{ transcript: string; reply: string }> {
  const fd = new FormData();
  // Use correct extension based on MIME so the server and Gemini parse it right
  const ext = blob.type.includes("mp4") || blob.type.includes("m4a") ? "mp4"
    : blob.type.includes("ogg") ? "ogg"
    : blob.type.includes("wav") ? "wav"
    : "webm";
  fd.append("audio", blob, `audio.${ext}`);
  try {
    const res = await fetch("/api/voice", { method: "POST", body: fd });
    if (!res.ok) return { transcript: "", reply: "" };
    return res.json();
  } catch {
    return { transcript: "", reply: "" };
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
  const mimeRef = useRef<string>("");

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
    const { transcript, reply } = await callVoiceAPI(blob);

    if (!reply) {
      setError("Ovoz aniqlanmadi. Qayta gapiring.");
      if (activeRef.current) setState("listening");
      return;
    }

    setState("speaking");
    await speakText(reply);
    if (activeRef.current) setState("listening");
    else setState("asleep");
  }, []);

  const startVADLoop = useCallback((stream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    // iOS: AudioContext starts suspended — must resume after user gesture (we're inside one)
    ctx.resume().catch(() => {});

    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.35;
    ctx.createMediaStreamSource(stream).connect(analyser);

    const mime = getBestMime();
    mimeRef.current = mime;
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

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // iOS requires sampleRate hint
          sampleRate: 16000,
        },
      });
    } catch (e) {
      console.error("getUserMedia error:", e);
      setError("Mikrofon ruxsati berilmadi.");
      setActive(false);
      setState("asleep");
      return;
    }
    streamRef.current = stream;

    setTimeout(() => {
      if (activeRef.current) {
        setState("listening");
        startVADLoop(stream);
      }
    }, 400);
  }, [startVADLoop]);

  const stopConversation = useCallback(() => {
    if (currentAudio) { currentAudio.pause(); currentAudio.src = ""; currentAudio = null; }
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
