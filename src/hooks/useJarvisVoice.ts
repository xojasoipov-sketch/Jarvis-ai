"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

// VAD thresholds
const SPEAK_THRESHOLD = 0.015;   // mic level above this = speech started
const SILENCE_THRESHOLD = 0.008; // below this = silence
const SILENCE_DURATION = 1400;   // ms of silence before stopping
const MIN_SPEECH_MS = 400;       // ignore clips shorter than this
const MAX_SPEECH_MS = 12000;     // max recording length

function getBestMime(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function buildTTS(text: string): SpeechSynthesisUtterance {
  const clean = text.replace(/[*_#`>]/g, "").replace(/\n+/g, " ").slice(0, 2000);
  const utter = new SpeechSynthesisUtterance(clean);
  const voices = window.speechSynthesis.getVoices();
  utter.voice =
    voices.find((v) => v.lang.startsWith("uz")) ||
    voices.find((v) => v.lang.startsWith("ru") && v.localService) ||
    voices.find((v) => v.lang.startsWith("ru")) ||
    voices.find((v) => v.localService) ||
    null;
  utter.lang = utter.voice?.lang || "ru-RU";
  utter.rate = 1.05;
  utter.pitch = 1.0;
  return utter;
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const utter = buildTTS(text);
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

async function callVoiceAPI(blob: Blob): Promise<{ transcript: string; reply: string }> {
  const fd = new FormData();
  fd.append("audio", blob, "audio.webm");
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
  const [active, setActive] = useState(false); // conversation mode on/off
  const [supported, setSupported] = useState(false);
  const [level, setLevel] = useState(0); // mic level 0..1 for animation

  const stateRef = useRef<JarvisState>("asleep");
  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const vadLoopRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const isSpeakingRef = useRef(false); // user is currently speaking
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined"
    );
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", () =>
        window.speechSynthesis.getVoices()
      );
    }
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
    if (blob.size < 1000) return; // too small, skip

    setState("thinking");
    const { transcript, reply } = await callVoiceAPI(blob);

    if (!reply) { setState("listening"); return; }

    setState("speaking");
    await speakText(reply);
    // After speaking, go back to listening if still active
    if (activeRef.current) setState("listening");
    else setState("asleep");
  }, []);

  const startVADLoop = useCallback((stream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    ctx.createMediaStreamSource(stream).connect(analyser);

    const mime = getBestMime();
    const data = new Float32Array(analyser.fftSize);

    function startRecording() {
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const elapsed = Date.now() - speechStartRef.current;
        if (elapsed >= MIN_SPEECH_MS && stateRef.current !== "asleep") {
          processChunks([...chunksRef.current], mime);
        } else if (activeRef.current) {
          setState("listening");
        }
      };
      rec.start(100);
      speechStartRef.current = Date.now();
      isSpeakingRef.current = true;
    }

    function stopRecording() {
      isSpeakingRef.current = false;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }

    function vadTick() {
      if (!activeRef.current) return;
      // Don't VAD while thinking or speaking (AI response)
      if (stateRef.current === "thinking" || stateRef.current === "speaking") {
        vadLoopRef.current = requestAnimationFrame(vadTick);
        return;
      }

      analyser.getFloatTimeDomainData(data);
      let rms = 0;
      for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
      rms = Math.sqrt(rms / data.length);
      setLevel(Math.min(rms / 0.1, 1));

      if (!isSpeakingRef.current && rms > SPEAK_THRESHOLD) {
        // Speech started
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setState("listening");
        startRecording();
        // Safety max duration
        setTimeout(() => {
          if (isSpeakingRef.current) stopRecording();
        }, MAX_SPEECH_MS);
      } else if (isSpeakingRef.current && rms < SILENCE_THRESHOLD) {
        // Silence detected — start countdown
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            stopRecording();
          }, SILENCE_DURATION);
        }
      } else if (isSpeakingRef.current && rms > SPEAK_THRESHOLD) {
        // Still speaking — cancel silence countdown
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      vadLoopRef.current = requestAnimationFrame(vadTick);
    }

    vadLoopRef.current = requestAnimationFrame(vadTick);
  }, [processChunks]);

  const startConversation = useCallback(async () => {
    if (activeRef.current) return;
    setActive(true);
    setState("waking");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
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
    }, 300);
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

  return { state, active, supported, level, toggle, stopConversation };
}
