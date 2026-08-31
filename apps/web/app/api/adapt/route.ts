import { NextResponse } from "next/server";
import { guard } from "@/lib/api-guard";
import { adaptCV, Profile } from "@/lib/atlas/mock";
import { adaptWithDeepSeek, hasDeepSeek } from "@/lib/ai/deepseek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = await guard(20);
  if (blocked) return blocked;

  let body: { raw?: string; profile?: Profile };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { raw, profile } = body;
  if (!raw || raw.trim().length < 40 || !profile?.experiences) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const heuristic = adaptCV(raw, profile);

  if (!hasDeepSeek()) {
    return NextResponse.json({ ...heuristic, _engine: "heuristic" });
  }

  try {
    const llm = await adaptWithDeepSeek(raw, profile);
    // Backfill anything the model left blank so the UI is never empty.
    return NextResponse.json({
      ...heuristic,
      ...llm,
      summaryLine: llm.summaryLine || heuristic.summaryLine,
      message: llm.message || heuristic.message,
      _engine: "deepseek",
    });
  } catch (err) {
    console.error("[adapt] deepseek failed, using heuristic:", err);
    return NextResponse.json({ ...heuristic, _engine: "heuristic-fallback" });
  }
}
