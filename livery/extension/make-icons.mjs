// Renders the extension icons from Livery's mark (run once; the PNGs are committed).
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#111111"/><path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" fill="#0d7268"/><rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" fill="#f4f3ed"/></svg>`;
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(join(here, `static/icons/icon-${size}.png`));
}
console.log("icons written");
