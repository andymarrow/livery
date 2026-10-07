export const SITE = {
  name: "Livery",
  domain: "livery.site",
  url: "https://livery.site",
  tagline: "Any website's design, as a skill for your coding agent.",
  description:
    "Paste a link, get an installable design kit. Your agent audits your project, asks before it changes anything, and applies the design one commit at a time.",
} as const;

export const BOT = {
  userAgent: "LiveryBot/1.0 (+https://livery.site/bot)",
} as const;

export const THEME_STORAGE_KEY = "livery-theme";

// Builds are expensive (a browser session and a model call); cached kits are free.
export const RATE_LIMITS = {
  build: { windowSeconds: 3600, max: 10 },
} as const;

// Bump when extraction changes; part of the kit cache key, so old kits rebuild on next request.
export const EXTRACTOR_VERSION = Number(process.env.EXTRACTOR_VERSION ?? 1);
export const FLOW_VERSION = 1;

/** The extension's Chrome Web Store page, once it's published (NEXT_PUBLIC_CHROME_EXTENSION_URL). */
export const EXTENSION_STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || null;
