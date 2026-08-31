import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { parseCVWithDeepSeek, hasDeepSeek } from "@/lib/ai/deepseek";
import { parseCVHeuristic } from "@/lib/atlas/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let text = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const rawText = formData.get("raw") as string | null;

      if (file) {
        const bytes = await file.arrayBuffer();
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const uint8 = new Uint8Array(bytes);
          const parser = new PDFParse({ data: uint8 });
          try {
            const textResult = await parser.getText();
            text = textResult.text || "";
          } finally {
            await parser.destroy();
          }
        } else {
          text = Buffer.from(bytes).toString("utf-8");
        }
      } else if (rawText) {
        text = rawText;
      }
    } else {
      const body = await request.json();
      text = body.raw || "";
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del documento o el archivo está vacío." },
        { status: 400 }
      );
    }

    if (!hasDeepSeek()) {
      const fallback = parseCVHeuristic(text);
      return NextResponse.json({ profile: fallback, _engine: "heuristic" });
    }

    try {
      const profile = await parseCVWithDeepSeek(text);
      return NextResponse.json({ profile, _engine: "deepseek" });
    } catch (err) {
      console.error("[parse-cv] DeepSeek parsing error, fallback to heuristic:", err);
      const fallback = parseCVHeuristic(text);
      return NextResponse.json({ profile: fallback, _engine: "heuristic-fallback" });
    }
  } catch (error: any) {
    console.error("[parse-cv] Server error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
