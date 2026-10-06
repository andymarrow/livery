// Writes data/google-fonts.json: the Google Fonts family names, taken from the
// list bundled with next/font. Re-run after upgrading Next.js.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(require.resolve("next/dist/compiled/@next/font/dist/google/font-data.json"), "utf8"));
const families = Object.keys(data).sort((a, b) => a.localeCompare(b));
writeFileSync(new URL("../data/google-fonts.json", import.meta.url), JSON.stringify(families) + "\n");
console.log(`wrote ${families.length} families`);
