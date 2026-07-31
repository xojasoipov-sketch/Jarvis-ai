import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

const BUCKET = "pari-files";

// POST /api/files/parse — download file from Supabase Storage and extract text
// body: { name: string } — filename in the bucket
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });

  const ext = name.split(".").pop()?.toLowerCase() || "";

  let fileBytes: Buffer;
  if (dbConfigured) {
    const { data, error } = await supabase!.storage.from(BUCKET).download(name);
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    fileBytes = Buffer.from(await data.arrayBuffer());
  } else {
    return NextResponse.json({ error: "Supabase sozlanmagan" }, { status: 503 });
  }

  try {
    if (ext === "pdf") {
      // Dynamic import — pdf-parse uses Node.js fs internally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMod: any = await import("pdf-parse");
      const pdfParse = pdfMod.default ?? pdfMod;
      const result = await pdfParse(fileBytes);
      return NextResponse.json({
        text: result.text.slice(0, 50000),
        pages: result.numpages,
        info: result.info,
      });
    }

    if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBytes });
      return NextResponse.json({ text: result.value.slice(0, 50000) });
    }

    if (["txt", "md", "csv", "json", "yaml", "yml", "html", "css", "js", "ts", "tsx", "py"].includes(ext)) {
      return NextResponse.json({ text: fileBytes.toString("utf-8").slice(0, 50000) });
    }

    return NextResponse.json({ error: `${ext} fayl turi qo'llab-quvvatlanmaydi (PDF, DOCX, TXT, MD, CSV)` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: `Parse xatosi: ${String(e)}` }, { status: 500 });
  }
}
