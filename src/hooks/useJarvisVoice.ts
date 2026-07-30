"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type JarvisState = "asleep" | "waking" | "listening" | "thinking" | "speaking";

const WAKE_WORDS = ["pari", "пари", "hey pari", "salom pari", "hello pari"];

// Server-side Groq Whisper transcription — works on iOS, Android, desktop
async function transcribe(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("audio", blob, "audio.webm");
  try {
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    if (!res.ok) return "";
    const d = await res.json();
    return (d.text || "").trim();
  } catch {
    return "";
  }
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const plain = text.replace(/```[\s\S]*?```/g, " kod bloki ").replace(/[*_#`]/g, "");
    const utter = new SpeechSynthesisUtterance(plain.slice(0, 2000));
    // Pick a voice: prefer Uzbek, fallback to Russian, then default
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith("uz")) ||
      voices.find((v) => v.lang.startsWith("ru")) ||
      null;
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || "ru-RU";
    utter.rate = 1.0;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function getBestMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/wav",
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useJarvisVoice(onCommand: (text: string) => Promise<string>) {
  const [state, setState] = useState<JarvisState>("asleep");
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");

  const stateRef = useRef<JarvisState>("asleep");
  const alwaysOnRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { alwaysOnRef.current = alwaysOn; }, [alwaysOn]);

  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const stopRecorder = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const captureCommand = useCallback(async () => {
    setState("listening");
    const chunks: BlobPart[] = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("asleep");
      return;
    }
    streamRef.current = stream;

    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (stateRef.current === "asleep") return; // user cancelled

      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
      setState("thinking");

      const text = await transcribe(blob);
      if (!text) { setState("asleep"); if (alwaysOnRef.current) startAlwaysOnCycle(); return; }

      setTranscript(text);
      const answer = await onCommand(text);
      setReply(answer);
      setState("speaking");
      await speak(answer);
      setState("asleep");
      if (alwaysOnRef.current) startAlwaysOnCycle();
    };

    recorder.start();
    // Auto-stop after 8 seconds max
    wakeTimerRef.current = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 8000);
  }, [onCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always-on: record 3s chunks, check for wake word, loop
  const startAlwaysOnCycle = useCallback(async () => {
    if (!alwaysOnRef.current || stateRef.current !== "asleep") return;
    const chunks: BlobPart[] = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { return; }
    streamRef.current = stream;

    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!alwaysOnRef.current || stateRef.current !== "asleep") return;

      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
      const text = await transcribe(blob);
      if (text && WAKE_WORDS.some((w) => text.toLowerCase().includes(w))) {
        wake();
      } else {
        startAlwaysOnCycle(); // loop
      }
    };

    recorder.start();
    setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 3000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wake = useCallback(() => {
    stopRecorder();
    setState("waking");
    setTranscript("");
    setReply("");
    setTimeout(() => captureCommand(), 300);
  }, [captureCommand, stopRecorder]);

  const stopListening = useCallback(() => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    stopRecorder();
    setState("asleep");
  }, [stopRecorder]);

  const toggleAlwaysOn = useCallback(() => {
    setAlwaysOn((prev) => {
      const next = !prev;
      alwaysOnRef.current = next;
      if (next) startAlwaysOnCycle();
      else stopListening();
      return next;
    });
  }, [startAlwaysOnCycle, stopListening]);

  useEffect(() => () => { stopRecorder(); }, [stopRecorder]);

  return { state, alwaysOn, supported, transcript, reply, toggleAlwaysOn, wake, stopListening };
}
