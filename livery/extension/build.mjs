// Builds the extension into extension/dist (or dist-dev with --dev, which
// talks to http://localhost:<port> instead of livery.site), and with --zip
// packs dist into livery-extension-<version>.zip for the Chrome Web Store.
//
//   node extension/build.mjs            production build
//   node extension/build.mjs --dev      local build (LIVERY_DEV_URL, default http://localhost:3125)
//   node extension/build.mjs --zip      production build + zip
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, statSync } from "node:fs";
import { zipSync } from "fflate";

const here = dirname(fileURLToPath(import.meta.url));
const test = process.argv.includes("--test");
const dev = process.argv.includes("--dev") || test;
const zip = process.argv.includes("--zip");
const url = dev ? (process.env.LIVERY_DEV_URL ?? "http://localhost:3125") : "https://www.livery.site";
const out = join(here, test ? "dist-test" : dev ? "dist-dev" : "dist");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: Object.fromEntries(["popup", "background", "connect", "measure"].map((name) => [name, join(here, `src/${name}.ts`)])),
  outdir: out,
  bundle: true,
  format: "esm",
  target: "chrome116",
  minify: !dev,
  legalComments: "none",
  // Nothing is loaded at runtime from anywhere else (Web Store rule): every byte is in the package.
  define: { __LIVERY_URL__: JSON.stringify(url), __LIVERY_TEST__: JSON.stringify(test) },
  logLevel: "warning",
});

cpSync(join(here, "static"), out, { recursive: true });
const manifest = JSON.parse(readFileSync(join(here, "static/manifest.json"), "utf8"));
if (dev) {
  const origin = new URL(url).origin;
  manifest.name = "Livery (dev)";
  manifest.host_permissions = [`${origin}/*`];
  manifest.content_scripts[0].matches = [`${origin}/extension/connect*`];
}
if (test) {
  // Automated tests can't click the toolbar icon, so this build may read any page. Never shipped.
  manifest.name = "Livery (test)";
  manifest.host_permissions = ["<all_urls>"];
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Built ${manifest.name} ${manifest.version} → ${out} (talks to ${url})`);

if (zip) {
  if (dev) throw new Error("zip the production build only");
  const files = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files[path.slice(out.length + 1)] = readFileSync(path);
    }
  };
  walk(out);
  const target = join(here, `livery-extension-${manifest.version}.zip`);
  writeFileSync(target, zipSync(files, { level: 9 }));
  console.log(`Zipped ${Object.keys(files).length} files → ${target}`);
}
