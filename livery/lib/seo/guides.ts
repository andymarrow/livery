// Long-form guides: useful on their own, and the pages most likely to be
// found by people searching for how to make AI-built apps look designed.
// Plain data so the pages, the sitemap and llms-full.txt share one source.

export type GuideBlock = string | { list: string[] } | { steps: string[] } | { code: string; label?: string } | { note: string };
export type GuideSection = { heading: string; blocks: GuideBlock[] };
export type Guide = {
  slug: string;
  title: string;
  /** Search snippet: 150–160 characters. */
  description: string;
  /** The short answer, quoted first: what search and answer engines lift. */
  answer: string;
  kicker: string;
  updated: string;
  minutes: number;
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "claude-code-design-system",
    title: "How to Give Claude Code a Design System",
    description: "Stop Claude Code shipping generic UI: give it a design system as a skill, with tokens, rules and the reasons behind them, and let it apply one area at a time.",
    answer:
      "Give Claude Code your design as a skill: a SKILL.md that tells it how to apply the design, a tokens.json with your colours, type, spacing and radii, and a rules file with the principles and the things to never do. Install it under .claude/skills, then ask Claude to apply it; it should audit your project, report the gap and change one area at a time, with your approval.",
    kicker: "Claude Code",
    updated: "2026-10-08",
    minutes: 7,
    sections: [
      {
        heading: "Why Claude Code's UI looks generic",
        blocks: [
          "Claude Code writes good components, but with no design to follow it falls back on safe defaults: a blue primary button, a grey card with a soft shadow, 16px body text and a rounded-lg on everything. Every app it builds ends up looking like every other app.",
          "The fix isn't a longer prompt. A prompt is forgotten after a few turns and can't hold a full palette, a type scale and a spacing system. Claude needs the design written down somewhere it reads every time it touches the interface: a skill.",
        ],
      },
      {
        heading: "What a design skill should contain",
        blocks: [
          "A design system for an agent is more than a list of hex codes. Values without reasons get applied in the wrong places. A useful skill has:",
          {
            list: [
              "Tokens: the palette by role (background, surface, text, muted text, border, accent), the type scale with sizes, weights and line heights, the spacing scale, radii, borders and shadows.",
              "Rules: the principles that make the design what it is (one accent per screen, borders instead of shadows, type that tightens as it grows) and a Never list.",
              "Components: how buttons, inputs, cards and navigation are built, including hover and focus states.",
              "Layout and motion: the container width, section rhythm, breakpoints, transition durations and easing.",
              "A process: what to do before editing anything, so Claude doesn't rewrite your app in one go.",
            ],
          },
        ],
      },
      {
        heading: "Install it as a Claude Code skill",
        blocks: [
          "Claude Code loads skills from .claude/skills in your project (or ~/.claude/skills for every project). Each skill is a folder with a SKILL.md at its root. The front matter tells Claude when to use it:",
          { code: "---\nname: my-design\ndescription: Apply our design system to this project. Use when asked to restyle or build UI.\n---\n\n# Our design system\n\nNever edit a file before step 5. Ask, don't assume.\n...", label: ".claude/skills/my-design/SKILL.md" },
          "Keep the data files (tokens.json, rules.md, components.md) next to SKILL.md and tell Claude to read each one only when its step needs it. That keeps its context small.",
        ],
      },
      {
        heading: "Make Claude ask before it changes anything",
        blocks: [
          "The most important part of the skill is the order of work. A good flow:",
          {
            steps: [
              "Audit the project: where tokens, theme files and hard-coded colours live, and how styling works (Tailwind, CSS modules, CSS-in-JS).",
              "Read the project's own rules (CLAUDE.md, AGENTS.md, lint rules) and note what must not change.",
              "Report the gap for each area (tokens, components, layout, motion) as small, medium or large.",
              "Ask which areas to apply, and resolve any conflict with your project rules.",
              "Apply one area per commit, so any change can be reverted on its own.",
              "Check text contrast in both themes before finishing.",
            ],
          },
        ],
      },
      {
        heading: "Get a design system from a site you admire",
        blocks: [
          "Writing all of this by hand takes days. Livery measures it from a live website instead: paste a link (or put livery.site/ in front of any address) and it renders the site at three screen sizes, measures its colours, type, spacing, components and motion, and writes the kit, SKILL.md and all, with the flow above built in.",
          "Every kit page has a one-paste install prompt for Claude Code that downloads the kit, verifies its sha256 hash and installs it under .claude/skills. Livery describes style only: it never copies logos, images, fonts or text.",
        ],
      },
    ],
  },
  {
    slug: "cursor-rules-for-design",
    title: "Cursor Rules for Design: Make AI-Built UIs Look On-Brand",
    description: "Use Cursor project rules to keep AI-generated UI on-brand: where to put design tokens, what rules to write, and how to keep Cursor's agent from drifting.",
    answer:
      "Put your design in Cursor's project rules (an .mdc file in .cursor/rules) as a short, always-on rule that points to fuller files: design tokens in JSON, a rules document with principles and a Never list, and component recipes. Keep the always-on rule brief, reference the detail by path, and ask the agent to apply changes one area at a time.",
    kicker: "Cursor",
    updated: "2026-10-08",
    minutes: 6,
    sections: [
      {
        heading: "Where design rules go in Cursor",
        blocks: [
          "Cursor reads project rules from .cursor/rules. Each rule is an .mdc file (Markdown with a short header) that can be always applied, attached to matching files, or pulled in when the agent decides it's relevant. For design, two layers work best:",
          {
            list: [
              "An always-on rule of a few lines: the non-negotiables (palette roles, the type scale, one accent, no gradients) and where the full system lives.",
              "Reference files the rule points to: tokens.json, rules.md, components.md. The agent reads them when it's building UI, not on every request.",
            ],
          },
          { code: "---\ndescription: Our design system\nalwaysApply: true\n---\n\nAlways follow the design system in .livery/my-site/.\n- Colours, type and spacing come from tokens.json; never hard-code values.\n- One accent per screen, on the primary action.\n- Read rules.md before building or restyling any UI.", label: ".cursor/rules/design.mdc" },
        ],
      },
      {
        heading: "Write rules with reasons",
        blocks: [
          "\"Use #0d7268 for buttons\" is followed for a while and then broken in a modal. \"The accent marks the one action you want taken, so use it once per screen\" survives new screens, because the agent understands the intent. Give every rule its reason, and keep a short Never list: never a gradient, never a coloured shadow, never body text under 14px.",
        ],
      },
      {
        heading: "Stop the agent from rewriting everything",
        blocks: [
          "Asked to \"apply the design\", an agent may restyle the whole app in one pass. Ask for a plan first, then one area per change: tokens first (so colours and spacing are centralised), then components, layout, motion. Review each diff on its own.",
        ],
      },
      {
        heading: "Start from a real site's design",
        blocks: [
          "A Livery kit is the same set of files, measured from any public website: tokens.json, rules.md, components.md, layout.md, motion.md and a SKILL.md with the step-by-step process. For Cursor, unzip it into your project and add the one-line rule above. The agent follows the same audit, ask and commit steps as in Claude Code.",
        ],
      },
    ],
  },
  {
    slug: "design-tokens-for-ai-agents",
    title: "Design Tokens for AI Coding Agents: What to Hand Over",
    description: "Which design tokens an AI coding agent actually needs (colour roles, type scale, spacing, radii, shadows, motion) and how to structure them so it applies them well.",
    answer:
      "An AI coding agent needs tokens by role, not just values: background, surface, text, muted text, border and accent colours (for light and dark), a type scale with sizes, weights, line heights and letter spacing, a spacing scale, radii, border widths, shadows and motion durations and easing. Name them by what they're for, so the agent puts each one in the right place.",
    kicker: "Design tokens",
    updated: "2026-10-08",
    minutes: 6,
    sections: [
      {
        heading: "Roles beat raw values",
        blocks: [
          "Given twelve hex codes, an agent has to guess which is the page background and which is the border. Given roles, it can't get it wrong. Name colours by job:",
          { code: '{\n  "palette": {\n    "background": "#efeee8",\n    "surface": "#f8f7f3",\n    "text": "#151513",\n    "textMuted": "#5c5a54",\n    "border": "#e4e2dc",\n    "accent": "#0d7268",\n    "onAccent": "#ffffff"\n  }\n}', label: "tokens.json" },
          "If your design has a dark theme, give it the same roles. The agent can then build both themes from one component.",
        ],
      },
      {
        heading: "The tokens that matter most",
        blocks: [
          {
            list: [
              "Type scale: each step's size, weight, line height and letter spacing, plus the font families. Headings that tighten as they grow are a big part of a design's feel.",
              "Spacing: the base unit (4px or 8px) and the values actually used. Agents over-pad without one.",
              "Radii: the main radius and where pills are used.",
              "Borders and shadows: whether depth comes from hairlines or soft shadows. Agents add shadows by default.",
              "Motion: durations and easing curves, and which properties animate.",
            ],
          },
        ],
      },
      {
        heading: "Measure, don't guess",
        blocks: [
          "Tokens copied from a screenshot drift: colours are off by a few points and the spacing scale is invented. Measuring the rendered page gives the values the site really uses and how often, so the dominant ones become the defaults. That's what Livery does: it renders a site at desktop, tablet and phone widths and measures every visible element, then writes tokens.json with roles, shares and the reasons behind them.",
        ],
      },
    ],
  },
  {
    slug: "recreate-a-websites-look",
    title: "Recreate a Website's Look Without Copying It",
    description: "How to borrow a website's design style for your own app without copying its assets: what's style (colours, spacing, type scale) and what belongs to the owner.",
    answer:
      "Recreate the style, not the assets. Measurable style (colour roles, a type scale, spacing, radii, motion timing) can guide your own design. The site's logo, photos, illustrations, custom icons, fonts you haven't licensed and its written copy belong to its owner, so don't reuse them; use your own or free alternatives. This isn't legal advice: when in doubt, ask the owner.",
    kicker: "Style vs assets",
    updated: "2026-10-08",
    minutes: 5,
    sections: [
      {
        heading: "Style versus assets",
        blocks: [
          "When people say they like a site's design, they usually mean its decisions: a restrained palette with one accent, generous spacing, type that tightens at large sizes, hairline borders instead of shadows. Those are style. The files that make up the site are assets:",
          {
            list: [
              "Logos and brand marks",
              "Photographs and illustrations",
              "Custom icon sets and drawings",
              "Commercial fonts (you need your own licence)",
              "The site's written copy",
            ],
          },
          "Use style as direction for your own work; don't reuse assets.",
        ],
      },
      {
        heading: "Fonts and icons: check the licence",
        blocks: [
          "Many sites use free fonts (Inter, Geist and Google Fonts) and open-source icon sets (Lucide, Phosphor) you can install yourself. Others use paid typefaces or icon sets. Install free ones from their official source, never from the site, and only use paid ones if you hold a licence. Otherwise pick a free alternative with a similar feel.",
        ],
      },
      {
        heading: "How Livery handles it",
        blocks: [
          "Livery measures style and labels every item in a kit: free to reuse, needs your licence (always with a free alternative), or style only, which your agent recreates in your own way. It never stores a site's images, logos, fonts, stylesheets or text. Site owners can opt in to share more through a livery.json file, or opt out and have kits withdrawn.",
        ],
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;
