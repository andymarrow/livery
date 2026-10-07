import { SITE } from "@/constants/constants";

export const kitPath = (slug: string, version: number) => `/k/${slug}/v${version}`;
/** Where people browse a kit: always its newest version. Install prompts pin `kitPath` instead. */
export const kitHome = (slug: string) => `/k/${slug}`;
/** A kit file's address; private versions add their key, which the file routes check. */
export const kitUrl = (slug: string, version: number, file?: string, key?: string | null) => `${SITE.url}${kitPath(slug, version)}${file ? `/${file}` : ""}${key ? `?key=${key}` : ""}`;

/** "v3" -> 3, anything else -> null. */
export function parseVersion(segment: string) {
  const match = /^v([1-9]\d{0,5})$/.exec(segment);
  return match ? Number(match[1]) : null;
}
