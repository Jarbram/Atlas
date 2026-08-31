import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adaptCV, Profile } from "@/lib/atlas/mock";
import { adaptWithDeepSeek, hasDeepSeek } from "@/lib/ai/deepseek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ponytail: in-memory per-user limiter, resets on redeploy. Swap for Redis/Upstash when it matters.
const hits = new Map<string, { n: number; resetAt: number }>();
const LIMIT = 20;
const WINDOW = 60 * 60 * 1000;

function overLimit(userId: string) {
  const now = Date.now();
  const e = hits.get(userId);
  if (!e || now > e.resetAt) {
    hits.set(userId, { n: 1, resetAt: now + WINDOW });
    return false;
  }
  if (e.n >= LIMIT) return true;
  e.n += 1;
  return false;
}

export async function POST(request: Request) {
  // Auth gate is active once Supabase is configured; skipped locally otherwise.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (overLimit(user.id)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

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
