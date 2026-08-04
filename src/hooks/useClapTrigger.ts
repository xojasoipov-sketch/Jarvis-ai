"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser double-clap detector (Web Audio)
 * Inspired by hectorg2211/jarvis desktop clap listener — adapted for web.
 */

type Options = {
  enabled?: boolean;
  onDoubleClap?: () => void;
  /** How much louder than noise floor counts as a clap */
  spikeRatio?: number;
  minRms?: number;
  cooldownS?: number;
  minGapS?: number;
  maxGapS?: number;
};

export function useClapTrigger(opts: Options = {}) {
  const {
    enabled = true,
    onDoubleClap,
    spikeRatio = 12,
    minRms = 0.04,
    cooldownS = 2.5,
    minGapS = 0.12,
    maxGapS = 0.7,
  } = opts;

  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRef = useRef(onDoubleClap);
  onRef.current = onDoubleClap;

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const noiseRef = useRef(0.01);
  const lastClapRef = useRef(0);
  const pendingClapRef = useRef(0);
  const coolUntilRef = useRef(0);
  const armedRef = useRef(true);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setListening(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      await ctx.resume().catch(() => {});

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const data = new Float32Array(analyser.fftSize);

      const tick = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 8));

        // adaptive noise floor
        noiseRef.current = noiseRef.current * 0.95 + rms * 0.05;
        const floor = Math.max(noiseRef.current, minRms * 0.5);
        const threshold = Math.max(minRms, floor * spikeRatio);
        const now = performance.now() / 1000;

        if (now < coolUntilRef.current) {
          armedRef.current = rms < threshold * 0.35;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (armedRef.current && rms >= threshold) {
          armedRef.current = false;
          const pending = pendingClapRef.current;

          if (pending > 0 && now - pending >= minGapS && now - pending <= maxGapS) {
            // double clap
            pendingClapRef.current = 0;
            lastClapRef.current = now;
            coolUntilRef.current = now + cooldownS;
            setLastEvent("double-clap");
            onRef.current?.();
          } else {
            pendingClapRef.current = now;
            lastClapRef.current = now;
            setLastEvent("clap");
            // expire single clap window
            window.setTimeout(() => {
              if (pendingClapRef.current === now) pendingClapRef.current = 0;
            }, maxGapS * 1000 + 50);
          }
        } else if (!armedRef.current && rms < threshold * 0.35) {
          armedRef.current = true;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mikrofon ochilmadi");
      stop();
    }
  }, [enabled, spikeRatio, minRms, cooldownS, minGapS, maxGapS, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, listening, level, lastEvent, error };
}

/** Play TTS from /api/tts */
export async function playTts(textOrWelcome: string | { welcome: true }, lang = "uz") {
  const url =
    typeof textOrWelcome === "object" && textOrWelcome.welcome
      ? `/api/tts?mode=welcome&lang=${lang}`
      : `/api/tts?lang=${lang}&text=${encodeURIComponent(String(textOrWelcome).slice(0, 500))}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("TTS failed");
  const blob = await res.blob();
  const src = URL.createObjectURL(blob);
  const audio = new Audio(src);
  await audio.play();
  audio.onended = () => URL.revokeObjectURL(src);
  return audio;
}
