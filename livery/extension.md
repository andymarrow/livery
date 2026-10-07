# Livery: accounts, private kits and the browser extension

The plan for measuring pages behind a login. It needs accounts first, then
private kits, then the extension. `PLAN.md` stays the master roadmap; this
file is the detailed plan for this track. Tick items off as they ship.

## 1. Decisions (agreed 2026-10-07)

| # | Topic | Decision |
|---|---|---|
| 1 | Visibility | Anything containing extension-measured pages is **private by default**. The owner can **Publish** it to the public library. |
| 1 | Accounts | Real accounts: email + password, **Google**, **GitHub**. Built on Supabase Auth. Transactional and auth email through **Resend**. |
| 2 | Adding to an existing kit | Publishes the **next version** of that kit with the new pages merged in (like a multi-page kit). Older versions keep working. |
| 3 | Who may add | Only the kit's **owner** (signed in). Everyone else gets a private copy that builds on it (see section 4.3). |
| 4 | Domains | The extension may only add pages from the **same domain** as the kit. |
| 5 | What leaves the browser | **Measurements and the content-removed frame only.** Copy is reduced to voice statistics inside the browser. No text, images or real screenshots are sent. |
| 6 | Creation flow | The Create page gets a "Pages behind a login? Use the extension" step; the extension adds pages to the kit being built. |
| 7 | Distribution | Packaged as a **zip** for a friend's Chrome Web Store developer account. Must pass review on the first try: MV3, minimal permissions, no remote code, clear privacy disclosures. |

## 2. Order of work

Each phase ships on its own branch, is usable on its own, and ends with a push.

| Phase | What | Depends on |
|---|---|---|
| **A. Accounts** | Sign up / in / out, Google + GitHub, password reset, Resend email, header account menu, "My kits" page | your keys (section 8) |
| **B. Ownership and private kits** | Kits built while signed in belong to you; private kits and versions; Publish; save kits to your library | A |
| **C. Captures API** | Server side for the extension: connect the extension to an account, receive a captured page, merge it into a kit | B |
| **D. The extension** | Chrome MV3 extension: measure the current tab, strip content, capture the frame, send it | C |
| **E. Create-flow and kit-page integration** | "Use the extension" step on Create, and an "Add pages behind a login" panel on a kit's page | C, D |
| **F. Store package** | Zip, icons, screenshots, listing text, privacy policy section, review checklist | D |

## 3. Phase A: accounts

### How it works

- **Supabase Auth** holds users, sessions, OAuth and password reset. No custom auth code.
- `@supabase/ssr` cookie sessions. A `proxy.ts` (Next 16's name for middleware) refreshes the session on each request.
- Server components and actions read the user with a server client (`utils/supabase/server.ts`, per `CLAUDE.md`). Client components use `app/_context/AuthContext.tsx`.
- Email (confirm address, reset password) is sent by Livery itself through the **Resend API**: Supabase generates the secure link (`auth.admin.generateLink`) without sending anything, and the templates live in `lib/email/`.

### Routes and files (following `CLAUDE.md` structure)

```
app/(AUTH)/layout.tsx                  quiet centred layout, no site header
app/(AUTH)/sign-in/page.tsx            email + password, Google, GitHub
app/(AUTH)/sign-up/page.tsx
app/(AUTH)/forgot-password/page.tsx
app/(AUTH)/update-password/page.tsx
app/auth/callback/route.ts             OAuth and email-link return (exchanges the code)
app/actions/signIn.ts, signUp.ts, signOut.ts, requestPasswordReset.ts, updatePassword.ts
app/_context/AuthContext.tsx
utils/supabase/server.ts, utils/supabase/client.ts
proxy.ts                               session refresh, protects /account and /me
app/(HOME)/me/page.tsx                 "My kits": owned kits, private kits, saved kits
app/(HOME)/_components/AccountMenu.tsx header: avatar menu, or "Sign in"
```

### Database (migration `…_accounts.sql`)

- `profiles` (id → `auth.users`, display name, avatar url, created_at), created by a trigger on sign-up. Readable by the owner only.
- `saved_kits` (user_id, kit_id, created_at), unique per pair. Owner-only RLS.
- The `/admin` area keeps its `ADMIN_SECRET`; it doesn't depend on accounts.

### Done when

- [x] Sign up with email gets a Resend email; confirm then sign in.
- [x] Google and GitHub sign-in enabled (providers redirect correctly).
- [x] Forgot password sends the reset email.
- [x] Header shows the account menu; `/me` lists saved kits.
- [x] RLS tests: one user can't read another's profile or saved kits.

## 4. Phase B: ownership and private kits

### 4.1 Ownership

- A kit built while signed in gets `owner_id` (the column already exists). Kits built signed out stay unowned.
- Combined kits (tastes, multi-page) built while signed in are owned too.

### 4.2 Private versions

Visibility lives on the **version**, not the kit. A public kit can then get a
private v2 (with dashboard pages) without hiding v1 from everyone.

- `kit_versions.visibility` = `public` | `private` (default `public`, so nothing changes for today's kits).
- RLS: anyone reads public ready versions (today's policy); the owner also reads their private ones.
- `kit_library`, Explore, the homepage, the sitemap and search only ever list public versions.
- The kit page (`/k/<slug>`) shows the newest version **you** can see. Private pages render per request (never statically cached), with a "Private · Publish" bar for the owner.
- Archives and `SKILL.md` of private versions are served only to the owner, or with a private install link that carries a long random token (so an agent can still install it).
- **Publish** turns a private version public; it's one-way. The owner gets a clear confirmation listing which logged-in pages it includes.

### 4.3 Adding to a kit you don't own

A signed-in user who adds logged-in pages to a public kit owned by someone else (or by no one) gets a **private copy**: a new kit owned by them, starting from the public one's pages plus their captures. The public kit is never changed by strangers.

### 4.4 Saving

- "Save" on any kit page adds it to `saved_kits`, and `/me` lists saved kits.

### Done when

- [ ] Building while signed in sets the owner; `/me` shows it.
- [ ] A private version is invisible to signed-out visitors and other users (page, archives, Explore, sitemap), but visible to its owner.
- [ ] Publish makes it appear in the library.
- [ ] DB tests for every policy above.

## 5. Phase C: captures API (server side for the extension)

### 5.1 Connecting the extension to an account

1. The extension's "Connect" button opens `livery.site/extension/connect` (signed in, or asks to sign in).
2. The page creates an **extension token** (random, stored hashed, revocable, 90 days) and hands it to the extension with `chrome.runtime.sendMessage(EXTENSION_ID, …)`. That's allowed only from livery.site through `externally_connectable`.
3. `/me` lists connected extensions with a Revoke button.

No passwords or cookies of the measured site ever reach Livery; the token only lets the extension post captures for this account.

### 5.2 Captures

- `page_captures` table: owner, url, domain, viewport (width/height), measurements (the same `RawDesign` the server extractor produces), voice statistics, frame storage path, created_at. Private to the owner (RLS).
- `POST /api/extension/captures` (Bearer extension token):
  - validates the payload size and shape (zod), and that the domain matches the target kit's domain (decision 4);
  - stores the measurements and the frame (WebP in the private `screenshots` bucket);
  - checks the frame really is content-removed by comparing it against the declared structure, as a size and shape sanity check.
- `GET /api/extension/targets?domain=…` lists what this page can be added to: the user's kits on that domain, their drafts in progress, and "Start a new kit".

### 5.3 Merging into a kit

- The combine pipeline (`controllers/combineKit.ts`) accepts **captures** as sources next to public page kits. `kit_sources` gets a nullable `capture_id`.
- Captures contribute desktop measurements only, since the extension sees the user's real window (section 6.3). Phone and tablet tokens come from the kit's public pages.
- Adding to an existing kit publishes its next version as **private** (decision 1 + 2). The owner can then Publish it.

### 5.4 Drafts (the creation flow)

- `kit_drafts`: owner, domain, the public links added so far, the captures added so far, status. A draft is what Create builds when the user wants logged-in pages too.
- The Create page shows the draft; captures sent from the extension appear in it live, by polling.

### Done when

- [ ] Connect, revoke, and token expiry work.
- [ ] A capture for another domain is refused; an oversized or malformed one is refused.
- [ ] A kit with a capture source builds, is private, and its page shows the captured page in its sources.

## 6. Phase D: the extension

### 6.1 Shape

- **Manifest V3**, Chrome first (Edge and Brave install from the same store).
- Source in `livery/extension/`, built with esbuild into `extension/dist/`, zipped by `npm run extension:zip`.
- Reuses the in-page measuring code (`lib/extract/collect/*`, `stripContent`), bundled, so server and extension measure identically.

### 6.2 Permissions (minimal, so the store doesn't flag it)

| Permission | Why |
|---|---|
| `activeTab` | Measure and capture only the tab the user clicked on, only after the click. No access to any site otherwise. |
| `scripting` | Inject the measuring script into that tab. |
| `storage` | Keep the extension token and preferences. |

No `<all_urls>`, no `host_permissions` beyond `https://livery.site/*` (for API calls), no `tabs`, no `debugger`, no `cookies`, no background tracking.

### 6.3 What happens on "Measure this page"

1. The user is signed into their own app in that tab and clicks the Livery icon. The popup shows the page, its domain, and where it can be added (targets from 5.2).
2. The script measures the live page (colours, type, spacing, radii, shadows, components, layout, motion).
3. Copy is turned into **voice statistics in the browser** (sentence length, casing, person); the text itself is discarded.
4. For the frame, the page is frozen (the same body swap the server uses), content is removed, and it's captured screen by screen with `chrome.tabs.captureVisibleTab`. Chrome allows two captures per second, so a tall page takes a few seconds; the popup shows progress. Slices are stitched with `OffscreenCanvas` into a WebP.
5. The original page is put back exactly as it was (the live body is swapped back in), so the user's app keeps working without a reload.
6. The popup shows a preview of what will be sent: the content-removed frame plus a summary of measurements. Only after **Send** is anything uploaded.

Limits to know:
- Hover and focus states aren't measured from the extension. The server does that with a headless browser; the extension would need the `debugger` permission, which we avoid.
- Only the current window width is measured (desktop, usually).

### 6.4 Popup screens

1. **Not connected**: "Connect Livery" (opens 5.1).
2. **Ready**: page + domain, a target picker (a kit on this domain, a draft, or a new kit), and **Measure**.
3. **Measuring**: progress, then a preview.
4. **Sent**: a link to the kit or draft.
5. **Not allowed here**: browser pages (`chrome://`), the Web Store, PDFs, and domains that don't match the chosen kit.

The UI is built in Livery's style (teal accent, light/dark following the system) and fits the store's 800×600 popup limit.

### Done when

- [ ] Works on a real logged-in dashboard; the page is restored afterwards.
- [ ] Nothing is sent before the user presses Send, and the request contains no text from the page.
- [ ] The token is revocable from `/me`.

## 7. Phase E and F

### E. Integration in the site

- **Create page:** a third option, "Pages behind a login", with a short explainer, install and connect buttons, and the live draft list.
- **Kit page (owner):** "Add pages behind a login", which opens a panel explaining the extension, with the kit preselected as the target.
- **Kit page (others):** "Make your own version with your logged-in pages", which leads to the private-copy flow (4.3).

### F. Store package (for your friend's developer account)

- [ ] `extension/manifest.json`: name, description (single purpose: "Measure the design of a page you're signed into and add it to your Livery kit"), version, icons 16/32/48/128, action popup, `externally_connectable: { matches: ["https://livery.site/*"] }`.
- [ ] All code bundled. No remote scripts, no `eval`, no obfuscation (the store rejects these).
- [ ] Privacy policy at `livery.site/legal/privacy#extension`: what's collected (measurements, content-removed image, voice statistics), what's never collected (text, images, cookies, passwords, browsing history), when (only on click), and where it goes.
- [ ] Store listing text, one-line summary, category (Developer Tools), 1280×800 screenshots, 440×280 promo tile.
- [ ] Data-use disclosures for the store form: "Website content" (measurements only, user-initiated), not sold, not used for anything else.
- [ ] `npm run extension:zip` produces `livery-extension-<version>.zip` with `manifest.json` at the root.
- [ ] Review checklist run before sending the zip.

**The extension ID:** the site must know the extension's ID for `externally_connectable` and messaging. The store assigns it on the first upload. Plan: your friend uploads the first version as a draft (it doesn't need to be published), sends us the ID and the item's public key, and we add both to the manifest and the site. Every later upload keeps that ID.

## 8. What you'll need to do (I'll walk you through each step when we get there)

Phase A:
1. **Google:** in Google Cloud Console, create an OAuth client (Web application) and set its consent screen. Redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`. Bring the **Client ID** and **Client secret** into Supabase (Authentication → Providers → Google).
2. **GitHub:** create an OAuth App (Settings → Developer settings) with the same callback URL. Bring its **Client ID** and **Client secret** into Supabase (Providers → GitHub).
3. **Supabase Auth settings:** Site URL `https://www.livery.site`; redirect URLs for production and `http://localhost:3000/auth/callback`; turn on email confirmation.
4. **Resend:** only `RESEND_API_KEY` in `.env` and Vercel (the `livery.site` domain is verified). Livery sends its own sign-up and reset emails (`lib/email/`); Supabase only makes the links, so no SMTP settings or dashboard templates.
5. Run the new migrations.

Phase F:
6. Send the zip to your friend; get the extension ID and public key back after the first upload.

## 9. Answers (2026-10-07)

1. **Pasted links stay public**, signed in or not. Only kits containing extension captures start private; the owner can Publish them.
2. **Subdomains count as the same domain** (`app.example.com` belongs with `example.com`): compared by registrable domain.
3. **No per-build pairing code.** Connecting the extension once to an account is enough; the extension lists your drafts and kits to add to.
4. **Signed-out visitors** keep building public kits without an account. Private kits, saving and the extension need sign-in.
