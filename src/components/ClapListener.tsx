"use client";

import { useCallback, useState } from "react";
import { useClapTrigger, playTts } from "@/hooks/useClapTrigger";

/**
 * Double-clap → ElevenLabs welcome (web)
 */
export default function ClapListener({
  className = "",
  autoWelcome = true,
  onDoubleClap,
}: {
  className?: string;
  autoWelcome?: boolean;
  onDoubleClap?: () => void;
}) {
  const [status, setStatus] = useState("off");
  const [busy, setBusy] = useState(false);

  const handle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatus("clap!");
    try {
      onDoubleClap?.();
      if (autoWelcome) {
        setStatus("speaking…");
        await playTts({ welcome: true }, "uz");
      }
      setStatus("ready");
    } catch {
      setStatus("tts error");
    } finally {
      setBusy(false);
    }
  }, [autoWelcome, busy, onDoubleClap]);

  const { start, stop, listening, level, lastEvent, error } = useClapTrigger({
    onDoubleClap: handle,
  });

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[11px] font-mono text-zinc-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tracking-wider text-zinc-500">CLAP SENSOR</span>
        <span className={listening ? "text-emerald-400" : "text-zinc-600"}>
          {listening ? "LIVE" : "IDLE"}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded bg-zinc-900">
        <div
          className="h-full bg-violet-500/80 transition-[width] duration-75"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!listening ? (
          <button
            type="button"
            onClick={() => start()}
            className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-900"
          >
            Mikrofon
          </button>
        ) : (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300"
          >
            Stop
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => handle()}
          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 disabled:opacity-40"
        >
          Test welcome
        </button>
        <span className="text-zinc-500">
          {error || status}
          {lastEvent ? ` · ${lastEvent}` : ""}
        </span>
      </div>

      <p className="mt-1 text-[10px] text-zinc-600">
        Ikki marta qarsak → ElevenLabs salom. (brauzer mikrofoni)
      </p>
    </div>
  );
}
