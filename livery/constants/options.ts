export const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/tastes", label: "Tastes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/agents", label: "Agents" },
  { href: "/owners", label: "Site owners" },
  { href: "/faq", label: "FAQ" },
] as const;

export const FOOTER_LINKS = {
  Product: [
    { href: "/explore", label: "Explore kits" },
    { href: "/create", label: "Create a kit" },
    { href: "/tastes", label: "Tastes" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/agents", label: "Install in your agent" },
    { href: "/faq", label: "FAQ" },
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
