// The popup. Connects to a Livery account, measures the current tab (only
// after the user presses Measure), shows exactly what would be sent, and
// sends it only after they press Send.
import { LIVERY_URL, TEST_BUILD } from "./config";
import type { MeasureApi } from "./measure";
import { stitch, toBase64, type Shot } from "./stitch";

type Target = { slug: string; title: string; kind: string; owned: boolean; visibility: "public" | "private"; version: number };
type Measured = Awaited<ReturnType<MeasureApi["measure"]>>;

const view = document.getElementById("view")!;
const account = document.getElementById("account")!;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function token() {
  return ((await chrome.storage.local.get("token")).token as string | undefined) ?? null;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const t = await token();
  const res = await fetch(`${LIVERY_URL}${path}`, { ...init, headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}), ...(init.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) await chrome.storage.local.remove(["token", "name"]);
  return { ok: res.ok, status: res.status, data };
}

function render(html: string) {
  view.innerHTML = html;
}

function showError(message: string, retry = true) {
  render(`<div class="icon">!</div><h1>Something went wrong</h1><p class="error">${esc(message)}</p>${retry ? `<div class="row"><button class="secondary" id="again">Try again</button></div>` : ""}`);
  document.getElementById("again")?.addEventListener("click", start);
}

function disconnected() {
  account.hidden = true;
  render(`
    <h1>Connect your Livery account</h1>
    <p>Then add pages you can only see when signed in (dashboards, settings) to your kits. They stay private until you publish them.</p>
    <div class="row"><button class="primary" id="connect">Connect</button></div>
    <p class="note">Opens livery.site in a new tab. Sign in there and this connects on its own.</p>`);
  document.getElementById("connect")!.addEventListener("click", () => chrome.tabs.create({ url: `${LIVERY_URL}/extension/connect` }));
}

// Pages the extension can't, or shouldn't, read.
function blockedReason(url: string | undefined) {
  if (!url) return "This tab has no page to measure.";
  if (!/^https?:/.test(url)) return "Livery can only measure web pages (not browser or extension pages).";
  if (/^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/.test(url)) return "Chrome doesn't let extensions read the Web Store.";
  if (/\.pdf($|\?)/i.test(url)) return "PDFs aren't web pages Livery can measure.";
  if (url.startsWith(LIVERY_URL)) return "This is Livery itself. Open a page from your own app.";
  return null;
}

async function start() {
  render(`<p>Loading…</p>`);
  const testTab = TEST_BUILD ? Number(new URLSearchParams(location.search).get("tab")) : 0;
  const [tab] = testTab ? [await chrome.tabs.get(testTab)] : await chrome.tabs.query({ active: true, currentWindow: true });
  if (!(await token())) return disconnected();

  const me = await api<{ name: string | null; email: string | null }>("/api/extension/me");
  if (me.status === 401) return disconnected();
  if (!me.ok) return showError("Couldn't reach Livery. Check your connection.");
  account.hidden = false;
  account.textContent = me.data.name ?? me.data.email ?? "Connected";

  const blocked = blockedReason(tab?.url);
  if (blocked || !tab?.id || !tab.url) return render(`<h1>Not this page</h1><p>${esc(blocked ?? "This tab can't be measured.")}</p>${footer()}`);

  const res = await api<{ site: string | null; targets: Target[] }>(`/api/extension/targets?url=${encodeURIComponent(tab.url)}`);
  if (!res.ok) return showError(res.data.error ?? "Couldn't load your kits.");
  if (!res.data.site) return render(`<h1>Not a public site</h1><p>Livery measures pages on public websites (not localhost or IP addresses).</p>${footer()}`);
  ready(tab as chrome.tabs.Tab & { id: number; url: string }, res.data.site, res.data.targets);
}

function footer() {
  return `<div class="row"><button class="link" id="disconnect">Disconnect this browser</button></div>`;
}

function bindFooter() {
  document.getElementById("disconnect")?.addEventListener("click", async () => {
    await api("/api/extension/me", { method: "DELETE" });
    await chrome.storage.local.remove(["token", "name"]);
    disconnected();
  });
}

function ready(tab: chrome.tabs.Tab & { id: number; url: string }, site: string, targets: Target[]) {
  const url = new URL(tab.url);
  const options = [
    ...targets.map((t, i) => ({ value: `kit:${t.slug}`, title: t.owned ? t.title : `A private copy of ${t.title}`, detail: t.owned ? `Your kit · next version v${t.version + 1}, private` : `Public kit · makes your own private copy`, checked: i === 0 })),
    { value: "new", title: `A new private kit for ${site}`, detail: "Just this page, to start", checked: targets.length === 0 },
  ];
  render(`
    <div class="page"><strong>${esc(tab.title || url.hostname)}</strong><span>${esc(url.hostname + url.pathname)}</span></div>
    <p class="label">Add this page to</p>
    <div class="targets">${options
      .map((o) => `<label class="target"><input type="radio" name="target" value="${esc(o.value)}"${o.checked ? " checked" : ""} /><span><b>${esc(o.title)}</b><small>${esc(o.detail)}</small></span></label>`)
      .join("")}</div>
    <button class="primary" id="measure">Measure this page</button>
    <p class="note">You'll see what would be sent first: measurements and an image with all text and pictures removed. Nothing leaves this page until you press Send.</p>
    ${footer()}`);
  bindFooter();
  document.getElementById("measure")!.addEventListener("click", () => {
    const value = (document.querySelector<HTMLInputElement>("input[name=target]:checked")?.value ?? "new").toString();
    const target = value === "new" ? { kind: "new" as const } : { kind: "kit" as const, slug: value.slice(4) };
    void measure(tab, target);
  });
}

async function run<T>(tabId: number, fn: (...args: never[]) => T, args: unknown[] = []) {
  const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: fn as never, args: args as never[] });
  return result?.result as Awaited<T>;
}

function progress(step: string, fraction: number) {
  render(`<h1>Measuring this page</h1><p>${esc(step)}</p><div class="progress"><i style="width:${Math.round(fraction * 100)}%"></i></div><p class="note">Keep this open. Your page is put back as it was when it's done.</p>`);
}

async function measure(tab: chrome.tabs.Tab & { id: number; url: string }, target: { kind: "kit"; slug: string } | { kind: "new" }) {
  try {
    progress("Reading the design…", 0.08);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["measure.js"] });
    const measured = await run(tab.id, () => (window as unknown as { __livery: MeasureApi }).__livery.measure()) as Measured;

    progress("Removing text and images for the picture…", 0.25);
    const page = await run(tab.id, () => (window as unknown as { __livery: MeasureApi }).__livery.prepare()) as { height: number; width: number; screen: number };
    const shots: Shot[] = [];
    try {
      for (let wanted = 0; wanted < page.height; wanted += page.screen) {
        const top = await run(tab.id, (y: number) => (window as unknown as { __livery: MeasureApi }).__livery.scrollTo(y), [wanted]) as number;
        await sleep(560); // Chrome allows two captures per second.
        shots.push({ dataUrl: await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }), top });
        progress(`Capturing the page… ${shots.length}`, 0.25 + 0.6 * Math.min(1, (top + page.screen) / page.height));
        if (top + page.screen >= page.height) break;
      }
    } finally {
      await run(tab.id, () => (window as unknown as { __livery: MeasureApi }).__livery.restore());
    }

    progress("Putting the picture together…", 0.92);
    const frame = await stitch(shots, page.width, page.height, page.screen);
    review(tab, target, measured, frame.blob);
  } catch (error) {
    await run(tab.id, () => (window as unknown as { __livery?: MeasureApi }).__livery?.restore()).catch(() => {});
    showError(error instanceof Error ? error.message : "This page couldn't be measured.");
  }
}

function topColours(measured: Measured) {
  const all = { ...measured.raw.colors.background, ...measured.raw.colors.text };
  return Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
}

function review(tab: chrome.tabs.Tab & { id: number; url: string }, target: { kind: "kit"; slug: string } | { kind: "new" }, measured: Measured, frame: Blob) {
  const url = URL.createObjectURL(frame);
  const r = measured.raw;
  render(`
    <h1>Check before sending</h1>
    <p>This is everything that will be sent. No text, images or sign-in details.</p>
    <div class="preview"><img src="${url}" alt="The page with its content removed" /></div>
    <div class="swatches">${topColours(measured).map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</div>
    <div class="facts">
      <span>${Object.keys(r.textStyles).length} type styles</span><span>${r.components.length} components</span>
      <span>${Object.keys(r.spacing).length} spacing values</span><span>${Object.keys(r.radii).length} corner radii</span>
    </div>
    <div class="row"><button class="secondary" id="cancel">Cancel</button><button class="primary" id="send">Send to Livery</button></div>`);
  document.getElementById("cancel")!.addEventListener("click", start);
  document.getElementById("send")!.addEventListener("click", () => void send(tab, target, measured, frame));
}

async function send(tab: chrome.tabs.Tab & { id: number; url: string }, target: { kind: "kit"; slug: string } | { kind: "new" }, measured: Measured, frame: Blob) {
  render(`<h1>Adding it to your kit</h1><p>Building a new private version…</p><div class="progress"><i style="width:60%"></i></div>`);
  const res = await api<{ path?: string; url?: string; mode?: string; version?: number }>("/api/extension/captures", {
    method: "POST",
    body: JSON.stringify({ url: tab.url, viewport: measured.viewport, raw: measured.raw, voice: measured.voice, frame: await toBase64(frame), target }),
  });
  if (!res.ok || !res.data.url) return showError(res.data.error ?? "Livery couldn't add this page.");
  const copy = res.data.mode === "copy" ? "We made you a private copy with this page added." : res.data.mode === "new" ? "A new private kit, starting with this page." : `v${res.data.version} of your kit now includes this page.`;
  render(`<div class="icon">✓</div><h1>Added. Private until you publish.</h1><p>${esc(copy)}</p><div class="row"><button class="primary" id="open">Open the kit</button></div><div class="row"><button class="secondary" id="another">Add another page</button></div>`);
  document.getElementById("open")!.addEventListener("click", () => chrome.tabs.create({ url: res.data.url! }));
  document.getElementById("another")!.addEventListener("click", start);
}

void start();
