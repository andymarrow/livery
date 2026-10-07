# Livery browser extension

Adds pages you can only see when signed in (dashboards, settings) to your
Livery kits. It measures the tab you choose, after you press Measure; shows
you everything it would send; and sends only measurements plus a picture with
all text and images removed. Results are private kits until you publish them.

## Build

```
npm run extension:build   # production build → extension/dist (talks to https://www.livery.site)
npm run extension:dev     # local build → extension/dist-dev (talks to http://localhost:3125)
npm run extension:zip     # production build + extension/livery-extension-<version>.zip
```

`LIVERY_DEV_URL=http://localhost:3000 npm run extension:dev` points the dev build at another port.

## Try it locally

1. `npm run dev -- -p 3125` (or set `LIVERY_DEV_URL`), then `npm run extension:dev`.
2. Chrome → `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick `extension/dist-dev`.
3. Click the Livery icon → **Connect** → sign in on the page that opens. The page says "Extension Connected".
4. Open a page from a public site, click the icon, pick where to add it, **Measure this page**, check the preview, **Send to Livery**.

## How it works

| File | Runs | Does |
|---|---|---|
| `src/popup.ts` | the popup | connect, pick a kit, measure, preview, send |
| `src/measure.ts` | injected into the chosen tab on Measure | measures the page with Livery's own code (`lib/extract/collect/*`), turns copy into voice numbers in the page, makes a content-removed copy for the screenshots, then puts the real page back |
| `src/stitch.ts` | the popup | joins screen-by-screen captures into one WebP |
| `src/background.ts` | background worker | trades the one-time code from the connect page for a token |
| `src/connect.ts` | only on `livery.site/extension/connect` | reads that code from the page |

The server side is `app/api/extension/*` (pair, me, targets, captures) and `controllers/captureKit.ts`.

## Chrome Web Store submission

Send `extension/livery-extension-<version>.zip` (made by `npm run extension:zip`). `manifest.json` is at the root of the zip.

### Listing

- **Name:** Livery
- **Summary (132 chars max):** Measure the design of a page you're signed into and add it to your Livery kit. Private until you publish.
- **Category:** Developer Tools
- **Language:** English
- **Homepage:** https://www.livery.site
- **Support:** https://www.livery.site/faq
- **Privacy policy:** https://www.livery.site/legal/privacy#extension
- **Description:**

  > Livery turns a website's design into a kit your coding agent can apply. This extension adds the pages Livery's own browser can't reach: the ones behind your login, like your app's dashboard or settings.
  >
  > Click the icon on a page, choose which kit to add it to, and press Measure. Livery reads the page's design (colours, fonts, spacing, corner shapes, motion, layout) and makes one picture of it with every piece of text and every image removed. You see exactly what would be sent, and nothing leaves the page until you press Send.
  >
  > The page's text never leaves your browser: it is turned into a few numbers (sentence length, casing) and discarded. No images, form contents, cookies or passwords are ever sent. The extension only works on the tab you click, only when you click, and keeps no history.
  >
  > The result is a private kit in your Livery account, visible only to you until you choose to publish it.

### Single purpose

> Measure the design of the page the user chooses and add it to their Livery kit.

### Permission justifications

| Permission | Justification for the review form |
|---|---|
| `activeTab` | To measure and capture only the tab the user clicked the extension on, only after that click. The extension has no access to any other tab or site. |
| `scripting` | To run Livery's measuring script in that tab when the user presses Measure. |
| `storage` | To keep the token that connects the extension to the user's Livery account, in the browser only. |
| Host permission `https://www.livery.site/*`, `https://livery.site/*` | To send the measurements to the user's Livery account and to read the one-time connection code on Livery's connect page. No other sites. |

**Remote code:** No. All code is in the package; nothing is downloaded or evaluated at runtime.

### Data usage (the "Privacy practices" tab)

- **Collected:** "Website content" only, and only measurements of the design of the page the user chooses, plus a picture with text and images removed. Sent only after the user reviews it and presses Send.
- **Not collected:** personally identifiable information, health, financial, authentication information (no passwords or cookies), personal communications, location, web history, user activity.
- Tick all three certifications: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

### Screenshots and promo tile

Ready in `extension/store/`: three 1280×800 screenshots (`01-choose-a-kit.png`, `02-check-before-sending.png`, `03-private-until-you-publish.png`) and the 440×280 promo tile (`promo-440x280.png`). They show the real popup on a made-up dashboard (`store/dashboard.html`, on example.com). The measurements and the content-removed picture are real. Regenerate after popup changes:

```
npm run extension:build && npm run extension:store
```

### After it's published

Set `NEXT_PUBLIC_CHROME_EXTENSION_URL` to the store page in Vercel and redeploy. The install buttons on `/extension`, Create and kit pages then link to it (until then they say "Coming soon").

## Extension ID

The store assigns the ID on the first upload. Livery doesn't depend on it (connecting works through the code on the connect page), so nothing needs changing after upload.

### Before each upload

- [ ] Bump `version` in `static/manifest.json`.
- [ ] `npm run extension:zip`, then load `extension/dist` unpacked and run the steps under "Try it locally" against the live site.
- [ ] Regenerate the store images if the popup changed (`npm run extension:store`).
- [ ] The manifest lists only `activeTab`, `scripting`, `storage` and the livery.site hosts (no `<all_urls>`).
