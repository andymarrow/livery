import { SITE } from "@/constants/constants";

export const kitPath = (slug: string, version: number) => `/k/${slug}/v${version}`;
export const kitUrl = (slug: string, version: number, file?: string) => `${SITE.url}${kitPath(slug, version)}${file ? `/${file}` : ""}`;

/** "v3" -> 3, anything else -> null. */
export function parseVersion(segment: string) {
  const match = /^v([1-9]\d{0,5})$/.exec(segment);
  return match ? Number(match[1]) : null;
}
