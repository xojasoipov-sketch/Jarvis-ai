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

export function useJarvisVoice(onCommand: (text: string) => Promise<string>) {
  const [state, setState] = useState<JarvisState>("asleep");
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const stateRef = useRef<JarvisState>("asleep");
  const alwaysOnRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { alwaysOnRef.current = alwaysOn; }, [alwaysOn]);

  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      window.speechSynthesis.cancel();
      const plain = text.replace(/```[\s\S]*?```/g, " kod bloki ").replace(/[*_#`]/g, "");
      const utter = new SpeechSynthesisUtterance(plain.slice(0, 2000));
      utter.lang = "uz-UZ";
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }, []);

  // Browser speech recognition language — uz-UZ is rarely supported; use ru-RU as closest
  // available Cyrillic locale, or empty string (browser default) as ultimate fallback.
  const speechLang = useRef("");
  useEffect(() => {
    const supported_langs = ["uz-UZ", "ru-RU", ""];
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    // Pick first lang that doesn't immediately error
    let idx = 0;
    function tryLang() {
      if (idx >= supported_langs.length) return;
      const r = new Ctor!();
      r.lang = supported_langs[idx];
      r.continuous = false;
      r.interimResults = false;
      r.onresult = () => { speechLang.current = supported_langs[idx]; r.abort(); };
      r.onerror = () => { idx++; tryLang(); };
      r.onend = () => {};
      try { r.start(); } catch { idx++; tryLang(); }
    }
    tryLang();
  }, []);

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

  const captureCommand = useCallback(() => {
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
    rec.onerror = () => {
      setState("asleep");
      if (alwaysOnRef.current) startWakeListening();
    };
    rec.onend = () => {};
    recRef.current = rec;
    try { rec.start(); } catch {}
  }, [onCommand, speak, startWakeListening]);

  const wake = useCallback(() => {
    setState("waking");
    setTranscript("");
    setReply("");
    setTimeout(() => {
      setState("listening");
      captureCommand();
    }, 300);
  }, [captureCommand]);

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
