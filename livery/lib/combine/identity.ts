import { createHash } from "node:crypto";

// How a combined kit is named and keyed. The key covers the kind, the
// curator and the links in order (the first link is the base), so the same
// request always lands on the same kit and its versions.

export const COMBINE_LIMITS = { min: 2, max: 5 } as const;
export type CombinedKind = "site" | "taste";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A display name as typed ("Andy", "Studio Roggy"), or null when there is nothing usable. */
export function cleanCurator(raw: unknown): { curator: string; curatorSlug: string } | null {
  if (typeof raw !== "string") return null;
  const curator = raw.replace(/[<>\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  const curatorSlug = slugify(curator).slice(0, 40).replace(/-+$/, "");
  return curator && curatorSlug ? { curator, curatorSlug } : null;
}

export function sourcesKey(kind: CombinedKind, curatorSlug: string | null, sourceUrls: string[]) {
  return sha256(JSON.stringify([kind, curatorSlug ?? "", sourceUrls]));
}

export function sourcesHash(versionIds: string[]) {
  return sha256(versionIds.join(","));
}

export function combinedSlug(kind: CombinedKind, key: string, input: { domain?: string; curatorSlug?: string | null; hosts?: string[] }) {
  const suffix = key.slice(0, 6);
  const stem = kind === "site" ? `${slugify(input.domain ?? "")}-pages` : `taste-${input.curatorSlug ?? slugify((input.hosts ?? []).join(" "))}`;
  return `${stem.slice(0, 100).replace(/-+$/, "")}-${suffix}`;
}

/** The kit's display name, used in SKILL.md, rules.md and commit messages. */
export function combinedName(kind: CombinedKind, input: { domain?: string; curator?: string | null; hosts?: string[] }) {
  if (kind === "site") return input.domain ?? "site";
  if (input.curator) return `${input.curator}'s taste`;
  const hosts = input.hosts ?? [];
  return `A taste across ${hosts.length <= 3 ? hosts.join(", ") : `${hosts.slice(0, 2).join(", ")} and ${hosts.length - 2} more`}`;
}
