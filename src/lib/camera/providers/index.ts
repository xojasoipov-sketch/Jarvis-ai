import type { CameraProvider, ICameraProvider } from "../types";
import { EzvizProvider } from "./ezviz-provider";
import { RtspProvider } from "./rtsp-provider";
import { MockCameraProvider } from "./mock-provider";

const registry = new Map<CameraProvider, ICameraProvider>([
  ["ezviz", new EzvizProvider()],
  ["rtsp",  new RtspProvider()],
  ["mock",  new MockCameraProvider()],
]);

export function getProvider(name: CameraProvider): ICameraProvider {
  const p = registry.get(name);
  if (!p) throw new Error(`Camera provider topilmadi: ${name}`);
  return p;
}
