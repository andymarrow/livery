import { fail, type ReadFailure } from "@/lib/extract/types";
import { isSensitivePath } from "@/lib/url/blocklist";
import type { PageSignals } from "./signals";

const CHALLENGE_TITLES = [/^just a moment/i, /^attention required/i, /^access denied/i, /^please wait/i, /^verifying you are human/i, /^security check/i, /captcha/i, /^pardon our interruption/i, /^request rejected/i];
const IDENTITY_HOSTS = /(^|\.)(okta\.com|auth0\.com|clerk\.(accounts\.dev|com)|accounts\.google\.com|login\.microsoftonline\.com|appleid\.apple\.com|onelogin\.com|workos\.com)$/;
const PAYMENT_FRAMES = /js\.stripe\.com|checkout\.stripe\.com|paypal\.com|paypalobjects\.com|adyen\.com|braintreegateway\.com|checkout\.com|klarna\.com|squareup\.com|google\.com\/pay|pay\.google\.com/;
const CARD_TOKENS = /^(cc-number|cc-csc|cc-exp|cc-exp-month|cc-exp-year|cardnumber|card-number|cvv|cvc|iban|routing)$/;

/**
 * Decides whether a rendered page is a real, public, non-sensitive page.
 * Runs before any extraction: nothing is ever extracted from a page that fails.
 */
export function detectBlock(s: PageSignals): ReadFailure | null {
  const header = (name: string) => s.headers[name.toLowerCase()] ?? "";
  const requested = new URL(s.requestedUrl);
  const final = new URL(s.finalUrl);

  // 1. Bot protection, by vendor signals first, then by generic challenge shape.
  if (header("cf-mitigated") === "challenge") return fail("bot_protection", "Cloudflare challenge");
  if (header("x-datadome") || s.markers.includes("datadome")) return fail("bot_protection", "DataDome");
  if (s.markers.includes("perimeterx")) return fail("bot_protection", "HUMAN / PerimeterX");
  if (header("x-amzn-waf-action")) return fail("bot_protection", "AWS WAF");
  if (s.markers.includes("cloudflare") || s.markers.includes("turnstile")) return fail("bot_protection", "Cloudflare challenge");
  if (s.markers.includes("hcaptcha") || (s.markers.includes("recaptcha") && s.textLength < 600))
    return fail("bot_protection", "CAPTCHA");
  const challengeTitle = CHALLENGE_TITLES.some((re) => re.test(s.title));
  if ([403, 429, 503].includes(s.status) && (challengeTitle || /cloudflare|akamai|ddos-guard|sucuri/i.test(header("server"))))
    return fail("bot_protection", header("server") || s.title);
  if (challengeTitle && s.textLength < 800) return fail("bot_protection", s.title);
  if (s.status === 401) return fail("login_required", "HTTP 401");
  if (s.status === 403) return fail("bot_protection", "HTTP 403");
  if (s.status === 429) return fail("bot_protection", "rate limited (HTTP 429)");

  // 2. Not found.
  if (s.status === 404 || s.status === 410) return fail("not_found", `HTTP ${s.status}`);
  if (s.status >= 500) return fail("empty_render", `server error (HTTP ${s.status})`);

  // 3. Login wall: we asked for a public page and were sent to a sign-in.
  const redirectedAway = final.hostname !== requested.hostname || final.pathname !== requested.pathname;
  if (redirectedAway && (IDENTITY_HOSTS.test(final.hostname) || isSensitivePath(final.pathname)))
    return fail("login_required", `redirected to ${final.hostname}${final.pathname}`);

  // 4. Sensitive page: login, payment, account. Refused even when public.
  const paymentFrame = s.frameSources.find((src) => PAYMENT_FRAMES.test(src));
  const cardField = s.fieldTokens.some((t) => CARD_TOKENS.test(t));
  if (paymentFrame || cardField) return fail("sensitive_page", paymentFrame ? "payment form" : "card fields");
  if (isSensitivePath(final.pathname)) return fail("sensitive_page", `${final.pathname} is a sign-in or payment page`);
  if (s.hasPasswordField && s.sensitiveFormShare > 0.4) {
    return redirectedAway
      ? fail("login_required", "the page is a sign-in form")
      : fail("sensitive_page", "the page is mostly a sign-in form");
  }

  // 5. Empty render: a failed single-page app, or a hidden block.
  if (s.textLength < 80 && s.elementCount < 25) return fail("empty_render", "almost nothing visible");
  if (s.stylesheetCount === 0 && s.textLength < 400) return fail("empty_render", "no styles loaded");

  return null;
}
