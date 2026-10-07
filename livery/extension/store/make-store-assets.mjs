// Makes the Chrome Web Store images (128×128 store icon, 1280×800 screenshots,
// 440×280 and 1400×560 promo tiles)
// from the real built popup (extension/dist), driven against a made-up
// dashboard on example.com. The measuring and the content-removed picture are
// real: measure.js runs on the dashboard. Only Chrome and the Livery API are
// stood in for.
//
//   npm run extension:build && node extension/store/make-store-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "../dist");
const PAGE = "https://app.example.com/overview";
const SIZE = { width: 1180, height: 900 };

const browser = await chromium.launch({ channel: "chromium" });
const png = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`;

// 1. The dashboard: as it looks, measured, and with its content removed.
const dash = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2 });
await dash.route(PAGE, (route) => route.fulfill({ contentType: "text/html", body: readFileSync(join(here, "dashboard.html")) }));
await dash.goto(PAGE);
const dashboard = await dash.screenshot();
await dash.addScriptTag({ content: readFileSync(join(dist, "measure.js"), "utf8"), type: "module" });
await dash.waitForFunction(() => window.__livery);
const measured = await dash.evaluate(() => window.__livery.measure());
const page = await dash.evaluate(() => window.__livery.prepare());
const stripped = await dash.screenshot();
await dash.evaluate(() => window.__livery.restore());
await dash.close();

// 2. The popup, in its three states.
async function popupShot(steps) {
  const popup = await browser.newPage({ viewport: { width: 360, height: 600 }, deviceScaleFactor: 2 });
  await popup.addInitScript(({ measured, page, shot, url }) => {
    const tab = { id: 1, windowId: 1, url, title: "Overview · Example Analytics" };
    window.__livery = { measure: () => measured, prepare: () => page, scrollTo: (y) => y, restore: () => true };
    window.chrome = {
      storage: { local: { get: async () => ({ token: "store-screenshot" }), remove: async () => {} } },
      tabs: { query: async () => [tab], get: async () => tab, create: async () => {}, captureVisibleTab: async () => shot },
      scripting: { executeScript: async ({ func, args }) => [{ result: func ? await func(...(args ?? [])) : undefined }] },
    };
  }, { measured, page, shot: png(stripped), url: PAGE });
  await popup.route("https://popup.test/**", (route) => route.fulfill({ path: join(dist, new URL(route.request().url()).pathname) }));
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  await popup.route("https://www.livery.site/api/extension/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const body = path.endsWith("/me")
      ? { name: "Jordan", email: null }
      : path.endsWith("/targets")
        ? { site: "example.com", targets: [{ slug: "example-com", title: "example.com", kind: "site", owned: true, visibility: "private", version: 3 }] }
        : { url: "https://www.livery.site/me/kits/example-com/v4", path: "/me/kits/example-com/v4", mode: "owned", version: 4 };
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
  });
  await popup.goto("https://popup.test/popup.html");
  await popup.waitForSelector("#measure");
  for (const step of steps) await step(popup);
  const height = await popup.evaluate(() => document.body.scrollHeight);
  const buffer = await popup.screenshot({ clip: { x: 0, y: 0, width: 360, height } });
  await popup.close();
  return { src: png(buffer), height };
}
const toReview = async (p) => { await p.click("#measure"); await p.waitForSelector("#send", { timeout: 60000 }); };
const toDone = async (p) => { await toReview(p); await p.click("#send"); await p.waitForSelector("#open"); };
const ready = await popupShot([]);
const review = await popupShot([toReview]);
const done = await popupShot([toDone]);

// 3. Compose.
const css = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; background: #efeee8; color: #111; font-family: Inter, -apple-system, "Segoe UI", sans-serif; }
  .copy { position: absolute; left: 56px; top: 0; bottom: 0; width: 320px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font: 600 12px/1 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: #0d7268; margin-bottom: 18px; }
  h1 { font-size: 40px; line-height: 1.08; letter-spacing: -.035em; font-weight: 700; }
  h1 span { color: #6b6a64; }
  p { margin-top: 18px; font-size: 17px; line-height: 1.55; color: #55544f; }
  .window { position: absolute; left: 424px; top: 72px; width: 800px; height: 656px; border: 1px solid #d9d7cf; border-radius: 16px; background: #fff; overflow: hidden; }
  .chrome { height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 16px; border-bottom: 1px solid #e4e2da; background: #f7f6f2; }
  .chrome i { width: 11px; height: 11px; border-radius: 50%; background: #d9d7cf; }
  .url { margin-left: 14px; flex: 0 1 380px; height: 26px; border-radius: 999px; background: #ecebe5; font-size: 12.5px; color: #55544f; display: flex; align-items: center; padding: 0 14px; }
  .ext { margin-left: auto; width: 26px; height: 26px; border-radius: 8px; border: 1px solid #0d7268; display: flex; align-items: center; justify-content: center; }
  .ext img { width: 16px; height: 16px; }
  .page { position: absolute; top: 44px; left: 0; width: 1180px; transform: scale(.678); transform-origin: top left; }
  .page img { width: 1180px; display: block; }
  .popup { position: absolute; top: 52px; right: 14px; width: 360px; border: 1px solid #d9d7cf; border-radius: 12px; overflow: hidden; background: #f4f3ed; }
  .popup img { width: 360px; display: block; }`;
const icon = png(readFileSync(join(dist, "icons/icon-128.png")));
const scene = (kicker, title, muted, body, popup) => `<!doctype html><html><head><style>${css}</style></head><body>
  <div class="copy"><div class="kicker">${kicker}</div><h1>${title} <span>${muted}</span></h1><p>${body}</p></div>
  <div class="window"><div class="chrome"><i></i><i></i><i></i><div class="url">app.example.com/overview</div><div class="ext"><img src="${icon}" alt="" /></div></div>
  <div class="page"><img src="${png(dashboard)}" alt="" /></div>
  <div class="popup"><img src="${popup.src}" alt="" /></div></div></body></html>`;
const shots = [
  ["01-choose-a-kit", scene("Livery for Chrome", "Pages behind your login,", "in your design kit.", "Open your app's dashboard or settings, click Livery and pick the kit to add the page to.", ready)],
  ["02-check-before-sending", scene("You see it first", "Text and images", "never leave the page.", "Livery measures the design and makes one picture with all content removed. Nothing is sent until you press Send.", review)],
  ["03-private-until-you-publish", scene("Private by default", "A new version", "only you can see.", "The page joins your kit as a private version. Publish it when you're ready, or keep it to yourself.", done)],
];
const out = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const [name, html] of shots) {
  await out.setContent(html);
  await out.waitForLoadState("networkidle");
  writeFileSync(join(here, `${name}.png`), await sharp(await out.screenshot()).removeAlpha().png().toBuffer());
}

// 4. Promo tile.
await out.setViewportSize({ width: 440, height: 280 });
await out.setContent(`<!doctype html><html><head><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 440px; height: 280px; background: #efeee8; color: #111; font-family: Inter, -apple-system, "Segoe UI", sans-serif; padding: 36px; display: flex; flex-direction: column; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; letter-spacing: -.03em; }
  .brand img { width: 40px; height: 40px; }
  h1 { font-size: 27px; line-height: 1.12; letter-spacing: -.03em; }
  h1 span { color: #0d7268; }
  .rule { height: 1px; background: #d9d7cf; }
</style></head><body><div class="brand"><img src="${icon}" alt="" />livery</div><div class="rule"></div><h1>Add pages behind your login <span>to your design kit.</span></h1></body></html>`);
writeFileSync(join(here, "promo-440x280.png"), await sharp(await out.screenshot()).removeAlpha().png().toBuffer());

// 5. Marquee promo tile (1400×560): the line on the left, the review step on the right.
await out.setViewportSize({ width: 1400, height: 560 });
await out.setContent(`<!doctype html><html><head><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1400px; height: 560px; overflow: hidden; background: #efeee8; color: #111; font-family: Inter, -apple-system, "Segoe UI", sans-serif; position: relative; }
  .copy { position: absolute; left: 88px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 700; letter-spacing: -.03em; margin-bottom: 40px; }
  .brand img { width: 46px; height: 46px; }
  h1 { font-size: 54px; line-height: 1.06; letter-spacing: -.04em; }
  h1 span { color: #0d7268; }
  p { margin-top: 22px; font-size: 20px; line-height: 1.5; color: #55544f; max-width: 540px; }
  .popup { position: absolute; right: 96px; top: 50%; transform: translateY(-50%); width: ${Math.round((460 / review.height) * 360)}px; border: 1px solid #d9d7cf; border-radius: 14px; overflow: hidden; background: #f4f3ed; }
  .popup img { width: 100%; display: block; }
</style></head><body>
  <div class="copy"><div class="brand"><img src="${icon}" alt="" />livery</div><h1>Pages behind your login, <span>in your design kit.</span></h1><p>Measure your app's dashboard or settings. Text and images never leave the page.</p></div>
  <div class="popup"><img src="${review.src}" alt="" /></div>
</body></html>`);
writeFileSync(join(here, "marquee-1400x560.png"), await sharp(await out.screenshot()).removeAlpha().png().toBuffer());

// 6. Store icon: 128×128 with the mark at 96×96 and 16px of transparent padding (the store's guideline).
const mark = await sharp(join(dist, "icons/icon-128.png")).resize(96, 96).toBuffer();
await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: mark, left: 16, top: 16 }])
  .png()
  .toFile(join(here, "store-icon-128.png"));

await browser.close();
console.log("Store images written to", here);
