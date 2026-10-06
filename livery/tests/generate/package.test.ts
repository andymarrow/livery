import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageKit, sha256 } from "@/lib/generate/package";
import { WEBP } from "./helpers";

const files = [
  { path: "SKILL.md", content: Buffer.from("---\nname: livery-x\n---\n# Kit\n") },
  { path: "tokens.json", content: Buffer.from(JSON.stringify({ a: 1 })) },
  { path: "frames/desktop.webp", content: WEBP },
];
const meta = { skillName: "livery-x", version: 1, flowVersion: 1 };
const has = (bin: string) => {
  try {
    execFileSync("which", [bin]);
    return true;
  } catch {
    return false;
  }
};

describe("packageKit", () => {
  it("is deterministic", () => {
    const a = packageKit(files, meta);
    const b = packageKit([...files].reverse(), meta);
    expect(a.contentHash).toBe(b.contentHash);
    expect(sha256(a.zip)).toBe(sha256(b.zip));
  });

  it("writes a manifest with a hash per file", () => {
    const { manifest, tar } = packageKit(files, meta);
    expect(manifest.files.map((f) => f.path)).toEqual(["SKILL.md", "frames/desktop.webp", "tokens.json"]);
    expect(manifest.files[0].sha256).toBe(sha256(files[0].content));
    expect(manifest.archives["kit.tar.gz"].sha256).toBe(sha256(tar));
  });

  it.skipIf(!has("tar"))("produces a tar.gz the system tar extracts byte for byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "livery-tar-"));
    writeFileSync(join(dir, "kit.tar.gz"), packageKit(files, meta).tar);
    execFileSync("tar", ["-xzf", join(dir, "kit.tar.gz"), "-C", dir]);
    for (const file of files) expect(readFileSync(join(dir, file.path)).equals(file.content)).toBe(true);
  });

  it.skipIf(!has("unzip"))("produces a zip that unzip reads", () => {
    const dir = mkdtempSync(join(tmpdir(), "livery-zip-"));
    writeFileSync(join(dir, "kit.zip"), packageKit(files, meta).zip);
    const listing = execFileSync("unzip", ["-l", join(dir, "kit.zip")]).toString();
    for (const file of files) expect(listing).toContain(file.path);
  });
});
