import { FLOW_VERSION } from "@/constants/constants";
import { LEVELS, type Level } from "./levels";

export type FlowInput = {
  skillName: string;
  siteName: string;
  version: number;
  levels: Level[];
  summary: string;
  licenceRequired: number;
  styleOnly: number;
  attribution: string | null;
};

// The flow is the product: a fixed template owned by Livery, identical in
// every kit (versioned by FLOW_VERSION). Only the header values change.
// Kit data lives in separate files the agent reads when it reaches each step,
// so this file stays short.
export function renderSkill(input: FlowInput) {
  const { skillName, siteName, version, levels, summary } = input;
  const levelLines = levels.map((l) => `${l}. ${LEVELS[l].name}: ${LEVELS[l].description}`).join("\n");

  return `---
name: ${skillName}
description: Apply the ${siteName} design kit (Livery v${version}) to this project. Use only when the user asks to apply this kit or this site's design.
---

# ${siteName} design kit · v${version} · flow ${FLOW_VERSION}

**Never edit a file before step 5. Ask, don't assume.**

${summary}

Kit files (read each one only when its step needs it): \`tokens.json\`, \`fonts.json\`, \`icons.json\`, \`components.md\`, \`layout.md\`, \`motion.md\`, \`voice.md\`, \`rules.md\`, \`licences.md\`, \`frames/\`.

Levels offered:
${levelLines}

## 0. Prepare
- Require git. If the working tree has uncommitted changes, ask the user to commit or stash first.
- Create and switch to the branch \`livery/${skillName.replace(/^livery-/, "")}-v${version}\`.
- If commits from an earlier run of this kit exist (\`livery(${siteName} v${version}): …\`), offer to resume after the last finished area.

## 1. Audit
Find theme files, design tokens, CSS variables, Tailwind config, fonts, the icon library and how colours are used.
Note the styling setup (Tailwind v4 or v3, CSS modules, shadcn/ui, CSS-in-JS, plain CSS).
Report colours that are scattered (hard-coded in many files) rather than centralised; offer to centralise them first.

## 2. Scan project rules
Read CLAUDE.md (root, nested, ~/.claude), AGENTS.md, .cursor/rules, .github/copilot-instructions.md, design docs, lint rules, and contrast or visual tests.
Sort each finding as hard (must keep), soft (preference) or unrelated.

## 3. Report the gap
For each area (tokens, components, layout, motion, voice), rate the gap small / medium / large in one or two lines, comparing the project with \`rules.md\` and \`tokens.json\`.

## 4. Ask
Ask which areas to apply. Warn clearly where the gap is large.
Ask what must not change (logo colours, required brand colours, legal copy).
For voice: show three of the user's own sentences rewritten with \`voice.md\`, then ask.

## 5. Resolve conflicts
For the chosen areas, quote each conflicting project rule with file:line. For each one offer: keep the rule / override once / override and update the rule.
For hard rules, ask a second time and repeat the rule's stated reason.

## 6. Licences
Read \`licences.md\`. Install fonts and icons only from their official sources (Google Fonts, Fontsource, npm), never from the source site.
For each item marked "needs a licence": use it only if the user confirms they hold a licence; otherwise use the listed free alternative.
Items marked "style only" (logos, photos, illustrations, custom icons) are recreated as style only: shape, weight and colour treatment, never copied files.
Styling the user's own login or checkout pages with these tokens is fine. Never recreate the source site's login, checkout or branding.

## 7. Apply
One area per commit, in this order: tokens → components → layout → motion → voice.
Commit message: \`livery(${siteName} v${version}): <area>\`. Edits to project rule files go in the same commit.
Read the data file for an area only when you reach it. Follow \`rules.md\` throughout, especially its "Never" list.

## 8. Verify
Check text contrast in both themes (4.5:1 for body text, 3:1 for large text and UI). If the accent fails on the user's backgrounds, adjust its lightness rather than shipping unreadable text.
If Playwright is available, screenshot the user's pages and compare their layout and rhythm with \`frames/\`; fix the differences.

## 9. Keep it
Offer to add the core of \`rules.md\` to the project's CLAUDE.md (or AGENTS.md) so future sessions keep the design.${input.attribution ? `\nAdd this attribution where licences.md asks for it: ${input.attribution}` : ""}

## 10. Summary
List what changed per area with its commit hash. To undo one area: \`git revert <hash>\`.
`;
}

/** Valid skill name: lowercase letters, numbers and hyphens, at most 64 characters. */
export function skillNameFor(slug: string) {
  return `livery-${slug}`.slice(0, 64).replace(/-+$/, "");
}
