// Facts gathered from a rendered page, used to decide whether there is a real
// public design to read. Collected in the browser by collectSignals().

export type PageSignals = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  title: string;
  /** Visible text characters in the body. */
  textLength: number;
  /** Stylesheets that actually applied (link + style elements with rules). */
  stylesheetCount: number;
  /** Visible elements in the body, a rough measure of "there is a page here". */
  elementCount: number;
  frameSources: string[];
  scriptSources: string[];
  /** autocomplete tokens, input types and names of visible form fields. */
  fieldTokens: string[];
  /** True when a visible password field sits in the main content. */
  hasPasswordField: boolean;
  /** Share of the page's visible elements inside the largest form holding a password or card field. */
  sensitiveFormShare: number;
  /** Known challenge markers found in the DOM. */
  markers: string[];
};

/**
 * Runs inside the page via page.evaluate. Must be self-contained: no imports,
 * no closures over Node values.
 */
export function collectSignals(): Omit<PageSignals, "requestedUrl" | "finalUrl" | "status" | "headers"> {
  const isVisible = (el: Element) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
  };

  const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();

  let stylesheetCount = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules.length > 0) stylesheetCount++;
    } catch {
      stylesheetCount++; // cross-origin sheet: it loaded, we just cannot read it
    }
  }

  const fields = Array.from(document.querySelectorAll("input, select, textarea")).filter(isVisible) as HTMLInputElement[];
  const fieldTokens = fields.flatMap((f) =>
    [f.getAttribute("autocomplete"), f.getAttribute("type"), f.getAttribute("name"), f.id]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase()),
  );

  // How much of the page a sign-in or card form makes up, by visible elements.
  // A login page is mostly its form; a site header with a small login is not.
  const visibleElements = Array.from(document.body?.querySelectorAll("*") ?? []).filter(isVisible);
  const sensitive = /password|cc-number|cc-csc|cc-exp|one-time-code|card|cvv|cvc|iban|routing/;
  let sensitiveFormShare = 0;
  for (const field of fields) {
    const tokens = [field.type, field.name, field.id, field.getAttribute("autocomplete")].join(" ").toLowerCase();
    if (!sensitive.test(tokens)) continue;
    const container = field.closest("form, [role=form]") ?? field.parentElement ?? field;
    const inside = visibleElements.filter((el) => container.contains(el)).length;
    sensitiveFormShare = Math.max(sensitiveFormShare, visibleElements.length ? inside / visibleElements.length : 0);
  }

  const markerSelectors: Record<string, string> = {
    cloudflare: "#challenge-form, #challenge-running, .cf-browser-verification, #cf-wrapper, #cf-challenge-running, script[src*='challenges.cloudflare.com']",
    turnstile: ".cf-turnstile, iframe[src*='challenges.cloudflare.com']",
    datadome: "script[src*='captcha-delivery.com'], iframe[src*='captcha-delivery.com']",
    perimeterx: "#px-captcha, script[src*='px-cloud.net'], script[src*='perimeterx']",
    hcaptcha: "iframe[src*='hcaptcha.com'], .h-captcha",
    recaptcha: "iframe[src*='google.com/recaptcha'], .g-recaptcha",
  };
  const markers = Object.entries(markerSelectors)
    .filter(([, selector]) => document.querySelector(selector))
    .map(([name]) => name);

  return {
    title: document.title.trim(),
    textLength: text.length,
    stylesheetCount,
    elementCount: visibleElements.length,
    frameSources: Array.from(document.querySelectorAll("iframe")).map((f) => f.src).filter(Boolean),
    scriptSources: Array.from(document.querySelectorAll("script[src]")).map((s) => (s as HTMLScriptElement).src),
    fieldTokens,
    hasPasswordField: fields.some((f) => f.type === "password"),
    sensitiveFormShare,
    markers,
  };
}
