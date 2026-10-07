import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Keeps signed-in sessions fresh and guards the account pages. Visitors who
// have never signed in carry no auth cookie and skip all of this, so the
// public site pays nothing for accounts.

const PRIVATE = /^\/(me)(\/|$)/;

export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  const wantsPrivate = PRIVATE.test(request.nextUrl.pathname);
  if (!hasSession) {
    if (!wantsPrivate) return NextResponse.next();
    return redirectToSignIn(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });
  // Verifies the session and refreshes it when it's about to expire.
  const { data } = await supabase.auth.getClaims();
  if (wantsPrivate && !data?.claims) return redirectToSignIn(request);
  return response;
}

function redirectToSignIn(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Pages and API routes; never static files, images or kit archives.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|zip|gz|md)$).*)"],
};
