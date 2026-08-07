"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrbScene, type OrbSceneApi } from "@/lib/ultron/orbScene";
import { HandTracker, type TrackerStatus } from "@/lib/ultron/handTracker";

type CameraState = "off" | "starting" | "on" | "error";

const MODE_LABEL: Record<TrackerStatus["mode"], string> = {
  idle: "STANDBY",
  spin: "SPIN",
  zoom: "ZOOM",
  point: "TARGETING",
};

/** Ultron orb UI — https://github.com/SAGAR-TAMANG/ultron-by-sagar-builds (MIT) */
export default function PariOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OrbSceneApi | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);

  const [camera, setCamera] = useState<CameraState>("off");
  const [status, setStatus] = useState<TrackerStatus>({ hands: 0, mode: "idle" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = createOrbScene(container);
    sceneRef.current = scene;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") {
        if (trackerRef.current) stopGestures();
        else void startGestures();
      }
      if (e.key === "r" || e.key === "R") sceneRef.current?.reset();
      if (e.key === "+" || e.key === "=") sceneRef.current?.zoomBy(0.92);
      if (e.key === "-" || e.key === "_") sceneRef.current?.zoomBy(1.08);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      trackerRef.current?.stop();
      trackerRef.current = null;
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse hover also lights up nodes — the network stays alive without a camera.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // touch/gesture drag shouldn't fight the orbit drag
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      sceneRef.current?.highlightAt(ndcX, ndcY);
    };

    container.addEventListener("pointermove", onMove);
    return () => container.removeEventListener("pointermove", onMove);
  }, []);

  const stopGestures = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
    setCamera("off");
    setStatus({ hands: 0, mode: "idle" });
  }, []);

  const startGestures = useCallback(async () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || trackerRef.current) return;

    setCamera("starting");
    setError(null);

    const tracker = new HandTracker(video, overlay, {
      onRotate: (dt, dp) => sceneRef.current?.rotateBy(dt, dp),
      onZoom: (factor) => sceneRef.current?.zoomBy(factor),
      onPoint: (ndcX, ndcY) => {
        if (ndcX === null || ndcY === null) sceneRef.current?.clearHighlight();
        else sceneRef.current?.highlightAt(ndcX, ndcY);
      },
      onStatus: setStatus,
    });
    trackerRef.current = tracker;

    try {
      await tracker.start();
      setCamera("on");
    } catch (err) {
      trackerRef.current = null;
      tracker.stop();
      setCamera("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "CAMERA ACCESS DENIED"
          : "TRACKING INIT FAILED",
      );
    }
  }, []);

  const toggleGestures = useCallback(() => {
    if (trackerRef.current) stopGestures();
    else void startGestures();
  }, [startGestures, stopGestures]);

  const cameraOn = camera === "on";

  return (
    <div className="relative h-full w-full bg-black text-white select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {/* webcam preview */}
      <div
        className={`absolute bottom-4 right-4 z-10 overflow-hidden rounded-lg border border-white/20 bg-black/60 ${
          cameraOn ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ width: 160, height: 120 }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          muted
          playsInline
        />
        <canvas
          ref={overlayRef}
          width={160}
          height={120}
          className="pointer-events-none absolute inset-0"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="pointer-events-auto">
          <div className="text-[10px] tracking-[0.25em] text-cyan-300/80">PARI · ORB</div>
          <div className="mt-1 text-xs text-white/50">
            {MODE_LABEL[status.mode]} · hands {status.hands}
          </div>
          {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
        </div>
        <button
          type="button"
          onClick={toggleGestures}
          className="pointer-events-auto rounded border border-white/20 bg-black/50 px-3 py-1.5 text-[11px] tracking-wider text-white/80 backdrop-blur hover:border-cyan-400/40"
        >
          {camera === "starting"
            ? "INITIALIZING…"
            : cameraOn
              ? "GESTURES ON"
              : "GESTURES OFF"}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 text-[10px] leading-relaxed text-white/35">
        Drag spin · Scroll zoom · G gestures · R reset
        <br />
        Pinch 1 hand spin · pinch 2 hands zoom · point a finger to light up a node
      </div>
    </div>
  );
}
