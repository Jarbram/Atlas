import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ponytail: in-memory per-user limiter, resets on redeploy. Swap for Redis/Upstash when it matters.
const hits = new Map<string, { n: number; resetAt: number }>();

function overLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || now > e.resetAt) {
    hits.set(key, { n: 1, resetAt: now + windowMs });
    return false;
  }
  if (e.n >= limit) return true;
  e.n += 1;
  return false;
}

/**
 * Auth + rate-limit gate for API route handlers.
 * Returns a Response to short-circuit with, or null to proceed.
 * When Supabase isn't configured (local dev) it lets everything through.
 */
export async function guard(limit: number, windowMs = 60 * 60 * 1000) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (overLimit(user.id, limit, windowMs)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  return null;
}
