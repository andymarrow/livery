// Runs only on livery.site/extension/connect (see manifest). Reads the one-time
// code the signed-in page shows and hands it to the background worker, which
// trades it for a token. Nothing else on any site is read.
const el = document.getElementById("livery-pairing");
const code = el?.getAttribute("data-livery-pairing-code");
if (code) chrome.runtime.sendMessage({ type: "livery:pair", code });
