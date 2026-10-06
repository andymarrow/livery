// Prints WCAG contrast ratios for the token pairs that carry text.
const L = (hex) => {
  const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
const themes = {
  light: { bg: "f6f5f1", surface: "ffffff", s2: "efeee9", fg: "151513", muted: "5c5a54", subtle: "736f68", accent: "0f7c72", onAccent: "ffffff", soft: "d7ece8", softFg: "0b5d55", warning: "855710", wsoft: "f6eedd", success: "2a6e46", ssoft: "e5f1e8", danger: "b4392f" },
  dark: { bg: "0c0c0d", surface: "141415", s2: "1b1b1d", fg: "ededea", muted: "a3a29c", subtle: "86857e", accent: "5fd4c2", onAccent: "052420", soft: "122e2a", softFg: "7cddcd", warning: "e3b45c", wsoft: "2c2312", success: "6fcf97", ssoft: "142a1e", danger: "f08a7e" },
};
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [a, b] of [["fg","bg"],["muted","bg"],["muted","surface"],["subtle","bg"],["subtle","surface"],["accent","bg"],["accent","surface"],["onAccent","accent"],["softFg","soft"],["warning","wsoft"],["success","ssoft"],["danger","surface"]])
    console.log(`  ${a.padEnd(9)} on ${b.padEnd(8)} ${ratio(t[a], t[b])}`);
}
