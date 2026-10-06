import { gunzipSync } from "fflate";

/** Reads the regular files out of a .tar.gz (ustar). Used to show kit files on the install page. */
export function untarGz(archive: Uint8Array) {
  const data = gunzipSync(archive);
  const files: { path: string; content: Buffer }[] = [];
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const field = (start: number, length: number) => Buffer.from(header.subarray(start, start + length)).toString("utf8").replace(/\0[\s\S]*$/, "");
    const name = field(0, 100);
    const prefix = field(345, 155);
    const size = parseInt(field(124, 12).trim() || "0", 8);
    const type = field(156, 1) || "0";
    offset += 512;
    if (type === "0") files.push({ path: prefix ? `${prefix}/${name}` : name, content: Buffer.from(data.subarray(offset, offset + size)) });
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}
