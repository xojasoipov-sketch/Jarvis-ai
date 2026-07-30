import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
          <ellipse cx="34" cy="34" rx="26" ry="18" fill="#a78bfa" transform="rotate(-35 34 34)" opacity="0.92" />
          <ellipse cx="66" cy="34" rx="26" ry="18" fill="#a78bfa" transform="rotate(35 66 34)" opacity="0.92" />
          <ellipse cx="36" cy="62" rx="18" ry="14" fill="#7c3aed" transform="rotate(20 36 62)" opacity="0.85" />
          <ellipse cx="64" cy="62" rx="18" ry="14" fill="#7c3aed" transform="rotate(-20 64 62)" opacity="0.85" />
          <ellipse cx="50" cy="58" rx="3.5" ry="13" fill="#4c1d95" opacity="0.9" />
          <circle cx="50" cy="42" r="4" fill="#4c1d95" opacity="0.9" />
        </svg>
      </div>
    ),
    size
  );
}
