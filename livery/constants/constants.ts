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
