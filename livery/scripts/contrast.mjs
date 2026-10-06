// Prints WCAG contrast ratios for the token pairs that carry text.
// Keep these values in sync with app/globals.css.
const L = (hex) => {
  const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export const themes = {
  light: { bg: "efeee8", surface: "f8f7f3", s2: "e8e7e0", fg: "1a1a17", muted: "55534d", subtle: "6a675f", accent: "0d7268", onAccent: "ffffff", soft: "d5e9e4", softFg: "0a5850", warning: "7d520f", wsoft: "f1e8d6", success: "286a43", ssoft: "dfece2", danger: "a8352b" },
  dark: { bg: "161718", surface: "1d1e20", s2: "242527", fg: "e6e5e0", muted: "a3a19b", subtle: "8c8a84", accent: "5fd4c2", onAccent: "052420", soft: "173430", softFg: "7cddcd", warning: "e3b45c", wsoft: "2e2614", success: "6fcf97", ssoft: "17301f", danger: "f08a7e" },
};
let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [a, b, min] of [["fg","bg",4.5],["muted","bg",4.5],["muted","surface",4.5],["muted","s2",4.5],["subtle","bg",4.5],["subtle","surface",4.5],["accent","bg",4.5],["accent","surface",4.5],["onAccent","accent",4.5],["softFg","soft",4.5],["warning","wsoft",4.5],["success","ssoft",4.5],["danger","surface",4.5]]) {
    const r = ratio(t[a], t[b]);
    if (r < min) failed++;
    console.log(`  ${a.padEnd(9)} on ${b.padEnd(8)} ${r.toFixed(2)}${r < min ? "  FAIL" : ""}`);
  }
}
process.exitCode = failed ? 1 : 0;
