"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrbScene, type OrbSceneApi } from "@/lib/orbScene";
import { HandTracker, type TrackerStatus } from "@/lib/handTracker";

type CameraState = "off" | "starting" | "on" | "error";

const MODE_LABEL: Record<TrackerStatus["mode"], string> = {
  idle: "STANDBY",
  spin: "SPIN",
  zoom: "ZOOM",
};

interface HermesOrbProps {
  /** Show the full HUD controls (default: true) */
  showControls?: boolean;
  /** Extra CSS class on the root wrapper */
  className?: string;
  /** Called when user activates gesture mode */
  onGestureToggle?: (active: boolean) => void;
}

export default function HermesOrb({
  showControls = true,
  className = "",
  onGestureToggle,
}: HermesOrbProps) {
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
    return () => {
      trackerRef.current?.stop();
      trackerRef.current = null;
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const stopGestures = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
    setCamera("off");
    setStatus({ hands: 0, mode: "idle" });
    onGestureToggle?.(false);
  }, [onGestureToggle]);

  const startGestures = useCallback(async () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || trackerRef.current) return;

    setCamera("starting");
    setError(null);

    const tracker = new HandTracker(video, overlay, {
      onRotate: (dt, dp) => sceneRef.current?.rotateBy(dt, dp),
      onZoom: (factor) => sceneRef.current?.zoomBy(factor),
      onStatus: setStatus,
    });
    trackerRef.current = tracker;

    try {
      await tracker.start();
      setCamera("on");
      onGestureToggle?.(true);
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
  }, [onGestureToggle]);

  const toggleGestures = useCallback(() => {
    if (trackerRef.current) stopGestures();
    else void startGestures();
  }, [startGestures, stopGestures]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      switch (e.key) {
        case "+": case "=": sceneRef.current?.zoomIn(); break;
        case "-": case "_": sceneRef.current?.zoomOut(); break;
        case "r": case "R": sceneRef.current?.resetView(); break;
        case "g": case "G": toggleGestures(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleGestures]);

  const cameraOn = camera === "on";

  return (
    <div className={`hermes-orb-wrapper ${className}`} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Visual overlays */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,106,26,0.5) 2px, rgba(255,106,26,0.5) 3px)",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        fontFamily: "monospace", fontSize: 11, letterSpacing: "0.4em",
        color: "rgba(255,140,60,0.7)", pointerEvents: "none", userSelect: "none",
      }}>
        H.E.R.M.E.S.
      </div>

      {showControls && (
        <div style={{
          position: "absolute", bottom: 16, right: 16,
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
        }}>
          {/* Camera preview */}
          {cameraOn && (
            <div style={{ position: "relative", width: 160, height: 120, borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,140,60,0.3)" }}>
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              <canvas ref={overlayRef} width={160} height={120} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              <div style={{
                position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center",
                fontFamily: "monospace", fontSize: 9, color: "rgba(255,140,60,0.8)",
              }}>
                {status.hands > 0 ? `${status.hands} HAND${status.hands > 1 ? "S" : ""} · ${MODE_LABEL[status.mode]}` : "SHOW HANDS"}
              </div>
            </div>
          )}

          {/* Hidden video/canvas when camera is off */}
          {!cameraOn && (
            <>
              <video ref={videoRef} muted playsInline style={{ display: "none" }} />
              <canvas ref={overlayRef} width={160} height={120} style={{ display: "none" }} />
            </>
          )}

          {error && (
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#ff4444", textAlign: "right" }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <OrbButton onClick={() => sceneRef.current?.zoomIn()} aria-label="Zoom in">+</OrbButton>
            <OrbButton onClick={() => sceneRef.current?.zoomOut()} aria-label="Zoom out">−</OrbButton>
            <OrbButton onClick={() => sceneRef.current?.resetView()}>RESET</OrbButton>
            <OrbButton
              onClick={toggleGestures}
              disabled={camera === "starting"}
              active={cameraOn}
            >
              {camera === "starting" ? "INIT…" : cameraOn ? "GESTURE ON" : "GESTURE OFF"}
            </OrbButton>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div style={{
        position: "absolute", bottom: 16, left: 16,
        fontFamily: "monospace", fontSize: 9, color: "rgba(255,140,60,0.35)",
        pointerEvents: "none", lineHeight: 1.8,
      }}>
        <div><kbd style={{ opacity: 0.7 }}>DRAG</kbd> orb · <kbd style={{ opacity: 0.7 }}>SCROLL</kbd> zoom</div>
        <div><kbd style={{ opacity: 0.7 }}>G</kbd> gestures · <kbd style={{ opacity: 0.7 }}>R</kbd> reset · <kbd style={{ opacity: 0.7 }}>+/−</kbd> zoom</div>
      </div>
    </div>
  );
}

function OrbButton({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? "rgba(255,106,26,0.18)" : "rgba(0,0,0,0.45)",
        border: `1px solid ${active ? "rgba(255,106,26,0.6)" : "rgba(255,140,60,0.25)"}`,
        color: active ? "#ff9a50" : "rgba(255,140,60,0.7)",
        fontFamily: "monospace",
        fontSize: 10,
        letterSpacing: "0.06em",
        padding: "4px 10px",
        borderRadius: 3,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
