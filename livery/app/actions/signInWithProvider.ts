"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { originOf, safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";

/** Starts Google or GitHub sign-in; the provider returns to /auth/callback. */
export async function signInWithProvider(provider: "google" | "github", next?: string) {
  if (provider !== "google" && provider !== "github") throw new Error("unknown provider");
  const origin = originOf(await headers());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  if (error || !data.url) redirect(`/sign-in?error=${encodeURIComponent(`${provider === "google" ? "Google" : "GitHub"} sign-in isn't available right now.`)}`);
  redirect(data.url);
}
