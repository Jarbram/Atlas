import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth redirect target: exchanges the code for a session, then sends the user in. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/perfil";
  // Only allow internal paths — block open-redirect via ?next=//evil.com
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/perfil";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
