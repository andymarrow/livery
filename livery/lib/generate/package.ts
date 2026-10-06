import { createHash } from "node:crypto";
import { gzipSync, zipSync } from "fflate";
import type { KitFile } from "./kit";

// Deterministic archives: the same files always produce the same bytes, so the
// sha256 in the copy-paste prompt is stable and verifiable.
const FIXED_MTIME = new Date("2026-01-01T00:00:00Z");

// Byte order, not localeCompare: archives must not depend on the server's locale.
const byPath = (a: KitFile, b: KitFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export const sha256 = (data: Buffer | Uint8Array) => createHash("sha256").update(data).digest("hex");

function tarHeader(path: string, size: number) {
  const header = Buffer.alloc(512, 0);
  const write = (value: string, offset: number, length: number) => header.write(value, offset, length, "utf8");
  const octal = (value: number, length: number) => value.toString(8).padStart(length - 1, "0") + "\0";
  if (Buffer.byteLength(path) > 100) throw new Error(`tar path too long: ${path}`);
  write(path, 0, 100);
  write(octal(0o644, 8), 100, 8);
  write(octal(0, 8), 108, 8);
  write(octal(0, 8), 116, 8);
  write(octal(size, 12), 124, 12);
  write(octal(Math.floor(FIXED_MTIME.getTime() / 1000), 12), 136, 12);
  write("        ", 148, 8); // checksum placeholder
  write("0", 156, 1);
  write("ustar\0", 257, 6);
  write("00", 263, 2);
  write("livery", 265, 32);
  write("livery", 297, 32);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return header;
}

export function tarGz(files: KitFile[]) {
  const blocks: Buffer[] = [];
  for (const file of [...files].sort(byPath)) {
    blocks.push(tarHeader(file.path, file.content.length), file.content);
    const pad = (512 - (file.content.length % 512)) % 512;
    if (pad) blocks.push(Buffer.alloc(pad, 0));
  }
  blocks.push(Buffer.alloc(1024, 0));
  return Buffer.from(gzipSync(Buffer.concat(blocks), { level: 9, mtime: FIXED_MTIME }));
}

export function zip(files: KitFile[]) {
  const entries: Record<string, [Uint8Array, { mtime: Date }]> = {};
  for (const file of [...files].sort(byPath)) entries[file.path] = [file.content, { mtime: FIXED_MTIME }];
  return Buffer.from(zipSync(entries, { level: 9 }));
}

export type Manifest = {
  kit: string;
  version: number;
  flowVersion: number;
  files: { path: string; bytes: number; sha256: string }[];
  archives: { "kit.tar.gz": { bytes: number; sha256: string }; "kit.zip": { bytes: number; sha256: string } };
};

export function packageKit(files: KitFile[], meta: { skillName: string; version: number; flowVersion: number }) {
  const tar = tarGz(files);
  const zipped = zip(files);
  const manifest: Manifest = {
    kit: meta.skillName,
    version: meta.version,
    flowVersion: meta.flowVersion,
    files: [...files].sort(byPath).map((f) => ({ path: f.path, bytes: f.content.length, sha256: sha256(f.content) })),
    archives: { "kit.tar.gz": { bytes: tar.length, sha256: sha256(tar) }, "kit.zip": { bytes: zipped.length, sha256: sha256(zipped) } },
  };
  // The content hash identifies the version: it is the tarball agents verify.
  return { tar, zip: zipped, manifest, contentHash: manifest.archives["kit.tar.gz"].sha256 };
}
