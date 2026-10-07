import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { originOf, safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";

// Links in Livery's emails (confirm your address, reset your password) land
// here with a token hash, which is verified into a session.
export async function GET(request: NextRequest) {
  const origin = originOf(request.headers);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(request.nextUrl.searchParams.get("next"), type === "recovery" ? "/update-password" : "/me");
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("That link has expired or was already used. Request a new one.")}`);
}
