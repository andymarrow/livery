// Prints WCAG contrast ratios for the token pairs that carry text.
// Keep these values in sync with app/globals.css.
const L = (hex) => {
  const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export const themes = {
  light: { bg: "f4f3ed", surface: "ffffff", s2: "eceae3", fg: "111111", muted: "636363", subtle: "636363", accent: "0d7268", fill: "0d7268", onAccent: "ffffff", soft: "d5e9e4", softFg: "0a5850", warning: "855710", wsoft: "f6eedd", success: "2a6e46", ssoft: "e5f1e8", danger: "b4392f" },
  dark: { bg: "030303", surface: "0a0a0c", s2: "181818", fg: "fafafa", muted: "a1a1a1", subtle: "8f8f8f", accent: "5fd4c2", fill: "5fd4c2", onAccent: "052420", soft: "10302b", softFg: "7cddcd", warning: "e3b45c", wsoft: "2c2312", success: "6fcf97", ssoft: "142a1e", danger: "f08a7e" },
};
let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [a, b, min] of [["fg","bg",4.5],["muted","bg",4.5],["muted","surface",4.5],["muted","s2",4.5],["subtle","bg",4.5],["subtle","surface",4.5],["subtle","s2",4.5],["accent","bg",4.5],["accent","surface",4.5],["onAccent","fill",4.5],["softFg","soft",4.5],["warning","wsoft",4.5],["success","ssoft",4.5],["danger","surface",4.5]]) {
    const r = ratio(t[a], t[b]);
    if (r < min) failed++;
    console.log(`  ${a.padEnd(9)} on ${b.padEnd(8)} ${r.toFixed(2)}${r < min ? "  FAIL" : ""}`);
  }
}
process.exitCode = failed ? 1 : 0;
