// ─── Vision Analysis Layer ────────────────────────────────────────────────────
// Ikki bosqichli pipeline:
//   1. Tez, arzon object detection (heuristics / lightweight model)
//   2. Faqat "qiziqarli" framelar uchun Vision LLM (OpenAI gpt-4o-mini / Claude)
//
// Bugungi holat: LLM-based analysis (snapshot URL berib analysis so'rash).
// Real deployment'da: local YOLO model yoki edge AI kerak.

import { callAI } from "@/lib/agents";
import type { DetectedObject, EventSeverity } from "../types";

export type VisionAnalysisResult = {
  objects: DetectedObject[];
  scene: string;
  summary: string;
  risk: EventSeverity;
  interesting: boolean;
};

// Obyektni severityga aylantirish
export function objectSeverity(type: DetectedObject["type"]): EventSeverity {
  if (type === "person")                         return "medium";
  if (type === "vehicle" || type === "car" || type === "truck") return "medium";
  if (type === "animal")                          return "low";
  if (type === "package")                         return "low";
  return "low";
}

// LLM orqali snapshot tahlil qilish
export async function analyzeSnapshot(snapshotUrl: string, context?: string): Promise<VisionAnalysisResult> {
  const prompt = `Sen kamera tahlilchisisan. Quyidagi snapshot URL'dagi rasmni tahlil qil.
${context ? `Kontekst: ${context}` : ""}

Quyidagi JSON formatida javob ber (boshqa narsa yozma):
{
  "objects": [{"type": "person|vehicle|car|truck|motorcycle|bicycle|animal|package|unknown", "confidence": 0.0-1.0, "bbox": {"x":0,"y":0,"width":0,"height":0}}],
  "scene": "qisqa tavsif",
  "summary": "nima ko'rinayotgani haqida 1-2 gap",
  "risk": "low|medium|high|critical",
  "interesting": true|false
}`;

  try {
    const res = await callAI("jarvis", [
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: snapshotUrl } },
      ]},
    ]);

    const text = typeof res === "string" ? res : JSON.stringify(res);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON topilmadi");
    const parsed = JSON.parse(jsonMatch[0]) as Partial<VisionAnalysisResult>;

    return {
      objects: parsed.objects || [],
      scene: parsed.scene || "noma'lum",
      summary: parsed.summary || "Tahlil amalga oshirildi.",
      risk: parsed.risk || "low",
      interesting: parsed.interesting ?? (parsed.objects && parsed.objects.length > 0) ?? false,
    };
  } catch {
    return { objects: [], scene: "tahlil qilinmadi", summary: "Vision tahlili amalga oshmadi.", risk: "low", interesting: false };
  }
}

// Oddiy text-based event classification (snapshot bo'lmaganda)
export function classifyEventSeverity(eventType: string, objects: DetectedObject[]): EventSeverity {
  if (eventType === "restricted_zone" || eventType === "suspicious_activity") return "critical";
  if (eventType === "camera_offline") return "high";
  if (objects.some(o => o.type === "person")) return "medium";
  if (objects.some(o => o.type === "vehicle" || o.type === "car")) return "medium";
  return "low";
}
