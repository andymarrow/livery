import { kitUrl } from "./urls";

export type PromptInput = { siteName: string; slug: string; version: number; sha256: string; skillName: string; /** Private versions: the key that lets the agent download it. */ key?: string | null };

/**
 * The copy-paste prompt. It downloads with curl (an agent's web-fetch tool may
 * summarise instead of returning bytes), verifies the sha256, extracts with tar
 * (present on macOS, Linux and Windows 10+) and hands over to SKILL.md.
 */
export function installPrompt({ siteName, slug, version, sha256, skillName, key }: PromptInput) {
  const dir = `.claude/skills/${skillName}`;
  return `Install the "${siteName}" design kit (v${version}) from Livery, then run it on this project.

1. mkdir -p ${dir}
2. curl -fsSL "${kitUrl(slug, version, "kit.tar.gz", key)}" -o /tmp/${skillName}.tar.gz
3. Verify: the sha256 of /tmp/${skillName}.tar.gz must be ${sha256}. If it doesn't match, stop and tell me.
4. tar -xzf /tmp/${skillName}.tar.gz -C ${dir}
5. Read ${dir}/SKILL.md and follow it. It will audit my project and ask me before changing anything.

If any response starts with "Couldn't read this site", stop and tell me. Don't continue.`;
}

/** What an agent receives from livery.site/<url> when the kit is ready. */
export function agentKitMarkdown(input: PromptInput & { publishedAt: string; skillMd: string }) {
  return `# ${input.siteName} design kit · v${input.version}

Published ${input.publishedAt.slice(0, 10)} by Livery. Install page: ${kitUrl(input.slug, input.version)}

## Install

${installPrompt(input)}

## Files

- Archive: ${kitUrl(input.slug, input.version, "kit.tar.gz")} (sha256 ${input.sha256})
- Zip: ${kitUrl(input.slug, input.version, "kit.zip")}
- Manifest: ${kitUrl(input.slug, input.version, "manifest.json")}

## SKILL.md (for reference; install the archive, it holds the data files)

${input.skillMd}
`;
}
