import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "@/lib/extract/assets";

describe("sanitizeSvg", () => {
  it("removes scripts, handlers, foreign objects and external references", () => {
    const dirty = `<svg viewBox="0 0 10 10" class="x" onload="alert(1)"><script>alert(1)</script><foreignObject><div/></foreignObject><a href="https://evil.example"><path d="M0 0h10" style="fill:url(https://evil.example/x)"/></a><use href="#shape"/></svg>`;
    const clean = sanitizeSvg(dirty)!;
    expect(clean).not.toMatch(/script|onload|foreignObject|evil\.example|class=/);
    expect(clean).toContain('href="#shape"');
    expect(clean).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("rejects things that aren't SVG", () => {
    expect(sanitizeSvg("<div>hi</div>")).toBeNull();
  });
});
