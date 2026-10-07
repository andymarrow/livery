import { NextResponse, type NextRequest } from "next/server";
import { originOf, safeNext } from "@/lib/auth/redirect";
import { logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

// Google and GitHub return here with a one-time code; it becomes a session
// cookie, then the visitor continues where they were going.
export async function GET(request: NextRequest) {
  const origin = originOf(request.headers);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const providerError = request.nextUrl.searchParams.get("error_description");
  if (providerError) return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(providerError)}`);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    logger.warn("auth.callback_failed", { error: error.message });
  }
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("That sign-in link didn't work. Try again.")}`);
}
