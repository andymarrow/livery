export const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/owners", label: "For site owners" },
] as const;

export const FOOTER_LINKS = {
  Product: [
    { href: "/explore", label: "Explore kits" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/about", label: "About" },
  ],
  Owners: [
    { href: "/owners", label: "Opt in or out" },
    { href: "/owners#check", label: "Check your site" },
    { href: "/bot", label: "About LiveryBot" },
  ],
  Legal: [
    { href: "/legal/terms", label: "Terms" },
    { href: "/legal/privacy", label: "Privacy" },
    { href: "/legal/takedown", label: "Takedown" },
  ],
} as const;

// Sites used as examples in the hero. Public, design-led, not sensitive.
export const EXAMPLE_SITES = ["rize.roggy.site", "goatrank.lol", "linear.app", "vercel.com"] as const;
