import { NextRequest, NextResponse } from "next/server";
import { canvaConfigured, canvaCreateCarousel } from "@/lib/canva";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, slides } = body as {
    title: string;
    slides: { heading: string; body: string }[];
  };

  if (!title || !Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "title va slides kerak" }, { status: 400 });
  }
  if (!canvaConfigured()) {
    return NextResponse.json(
      { error: "Canva sozlanmagan: CANVA_ACCESS_TOKEN kerak" },
      { status: 503 }
    );
  }

  try {
    const results = await canvaCreateCarousel({
      title,
      slideCount: slides.length,
      slides,
    });
    return NextResponse.json({ slides: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
