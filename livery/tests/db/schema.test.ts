import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { asRole, createDatabase } from "./setup";

const HASH = "a".repeat(64);
let db: PGlite;

async function startBuild(url = "https://example.com/", slug = "example-com") {
  const { rows } = await db.query<{ kit_id: string; kit_version_id: string; claimed: boolean }>(
    `select * from public.start_build($1, 'example.com', $2, 1, 1)`,
    [url, slug],
  );
  return rows[0];
}

async function publish(versionId: string, items: object[] = []) {
  const { rows } = await db.query<{ publish_build: number }>(
    `select public.publish_build($1, '{"tokens":{}}', '# kit', 'kits/x/v.zip', 'kits/x/v.tar.gz', '{}', $2, '{1,2,3}', $3)`,
    [versionId, HASH, JSON.stringify(items)],
  );
  return rows[0].publish_build;
}

beforeEach(async () => {
  db = await createDatabase();
});

describe("build lock", () => {
  it("lets only one build run per kit", async () => {
    const first = await startBuild();
    const second = await startBuild();
    expect(first.claimed).toBe(true);
    expect(second).toMatchObject({ claimed: false, kit_version_id: first.kit_version_id });
  });

  it("frees the lock after a failure", async () => {
    const first = await startBuild();
    await db.query(`select public.fail_build($1, 'boom')`, [first.kit_version_id]);
    expect((await startBuild()).claimed).toBe(true);
  });

  it("replaces a stale build", async () => {
    const first = await startBuild();
    await db.query(`update public.kit_versions set build_started_at = now() - interval '1 hour' where id = $1`, [
      first.kit_version_id,
    ]);
    const next = await startBuild();
    expect(next.claimed).toBe(true);
    const { rows } = await db.query<{ status: string }>(`select status from public.kit_versions where id = $1`, [
      first.kit_version_id,
    ]);
    expect(rows[0].status).toBe("failed");
  });
});

describe("publishing", () => {
  it("numbers versions without gaps from failed builds", async () => {
    const a = await startBuild();
    await db.query(`select public.fail_build($1, 'x')`, [a.kit_version_id]);
    const b = await startBuild();
    expect(await publish(b.kit_version_id)).toBe(1);
    const c = await startBuild();
    expect(await publish(c.kit_version_id)).toBe(2);
  });

  it("stores licence items and rejects a licence item without an alternative", async () => {
    const a = await startBuild();
    await publish(a.kit_version_id, [{ kind: "font", name: "Inter", source: "google-fonts", licence: "free", licence_name: "OFL-1.1" }]);
    const { rows } = await db.query(`select name, licence from public.kit_items`);
    expect(rows).toEqual([{ name: "Inter", licence: "free" }]);

    const b = await startBuild();
    await expect(publish(b.kit_version_id, [{ kind: "font", name: "Paid Sans", licence: "licence_required" }])).rejects.toThrow();
  });
});

describe("permanence", () => {
  it("refuses edits and deletes of a published version", async () => {
    const a = await startBuild();
    await publish(a.kit_version_id);
    await expect(db.query(`update public.kit_versions set skill_md = 'changed' where id = $1`, [a.kit_version_id])).rejects.toThrow(
      /cannot be changed/,
    );
    await expect(db.query(`delete from public.kit_versions where id = $1`, [a.kit_version_id])).rejects.toThrow(/withdraw/);
  });

  it("freezes items with their version", async () => {
    const a = await startBuild();
    await publish(a.kit_version_id, [{ kind: "icon_set", name: "Lucide", licence: "free" }]);
    await expect(db.query(`update public.kit_items set name = 'x'`)).rejects.toThrow(/cannot be changed/);
    await expect(
      db.query(`insert into public.kit_items (kit_version_id, kind, name, licence) values ($1, 'icon', 'x', 'free')`, [a.kit_version_id]),
    ).rejects.toThrow(/cannot be changed/);
  });

  it("allows withdrawing, and returns the artefact paths to delete", async () => {
    const a = await startBuild();
    await publish(a.kit_version_id);
    const { rows } = await db.query(`select * from public.withdraw_version($1)`, [a.kit_version_id]);
    expect(rows[0]).toEqual({ zip_path: "kits/x/v.zip", tar_path: "kits/x/v.tar.gz" });
    const after = await db.query<{ status: string; zip_path: string | null }>(
      `select status, zip_path from public.kit_versions where id = $1`,
      [a.kit_version_id],
    );
    expect(after.rows[0]).toEqual({ status: "withdrawn", zip_path: null });
    await expect(db.query(`select * from public.withdraw_version($1)`, [a.kit_version_id])).rejects.toThrow(/not published/);
  });
});

describe("rate limits", () => {
  it("counts atomically and blocks over the limit", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { rows } = await db.query<{ allowed: boolean }>(`select allowed from public.bump_rate('build:abc', 3600, 3)`);
      results.push(rows[0].allowed);
    }
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("read failures", () => {
  it("upserts and counts hits", async () => {
    for (let i = 0; i < 3; i++) {
      await db.query(
        `select public.record_read_failure('https://blocked.example/', 'blocked.example', 'bot_protection', 'cloudflare', now() + interval '1 day')`,
      );
    }
    const { rows } = await db.query(`select reason, hits from public.read_failures`);
    expect(rows).toEqual([{ reason: "bot_protection", hits: 3 }]);
  });
});

describe("row level security", () => {
  it("shows anon only published kits and items", async () => {
    const draft = await startBuild("https://draft.example.com/", "draft-example-com");
    const live = await startBuild();
    await publish(live.kit_version_id, [{ kind: "icon_set", name: "Lucide", licence: "free" }]);

    const seen = await asRole(db, "anon", async () => ({
      kits: (await db.query<{ slug: string }>(`select slug from public.kits`)).rows.map((r) => r.slug),
      versions: (await db.query(`select id from public.kit_versions`)).rows.length,
      items: (await db.query(`select id from public.kit_items`)).rows.length,
    }));
    expect(seen).toEqual({ kits: ["example-com"], versions: 1, items: 1 });
    expect(draft.claimed).toBe(true);
  });

  it("never lets anon write or read internal tables", async () => {
    await asRole(db, "anon", async () => {
      await expect(db.query(`insert into public.sites (domain) values ('evil.com')`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.rate_limits`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.read_failures`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`update public.kit_versions set status = 'ready'`)).rejects.toThrow(/permission denied/);
    });
  });

  it("never lets anon call server functions", async () => {
    await asRole(db, "anon", async () => {
      await expect(db.query(`select * from public.bump_rate('k', 60, 1)`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.start_build('https://a.com/', 'a.com', 'a-com', 1, 1)`)).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("lets the service role run the full flow", async () => {
    await asRole(db, "service_role", async () => {
      const build = await startBuild();
      expect(await publish(build.kit_version_id)).toBe(1);
    });
  });
});

describe("takedown requests", () => {
  it("are written by the server and invisible to anon", async () => {
    await db.query(`insert into public.takedown_requests (domain, email, message, relationship) values ('example.com', 'a@example.com', 'please remove', 'owner')`);
    await asRole(db, "anon", async () => {
      await expect(db.query(`select * from public.takedown_requests`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`insert into public.takedown_requests (domain, email, message, relationship) values ('x.com', 'a@x.com', 'm', 'owner')`)).rejects.toThrow(/permission denied/);
    });
  });

  it("reject malformed emails", async () => {
    await expect(db.query(`insert into public.takedown_requests (domain, email, message, relationship) values ('example.com', 'nope', 'm', 'owner')`)).rejects.toThrow();
  });
});

describe("operations", () => {
  it("lists blocked domains for outreach, hidden from anon", async () => {
    await db.query(`select public.record_read_failure('https://a.example/', 'a.example', 'bot_protection', null, now() + interval '1 day')`);
    await db.query(`select public.record_read_failure('https://a.example/', 'a.example', 'bot_protection', null, now() + interval '1 day')`);
    await db.query(`select public.record_read_failure('https://b.example/', 'b.example', 'timeout', null, now() + interval '1 hour')`);
    const { rows } = await db.query(`select domain, hits from public.blocked_domains`);
    expect(rows).toEqual([{ domain: "a.example", hits: 2 }]);
    await asRole(db, "anon", async () => {
      await expect(db.query(`select * from public.blocked_domains`)).rejects.toThrow(/permission denied/);
    });
  });

  it("finds frames of withdrawn versions for cleanup", async () => {
    const a = await startBuild();
    await publish(a.kit_version_id);
    await db.query(`select * from public.withdraw_version($1)`, [a.kit_version_id]);
    const { rows } = await db.query<{ kit_version_id: string }>(`select * from public.stale_frame_versions()`);
    expect(rows.map((r) => r.kit_version_id)).toEqual([a.kit_version_id]);
  });
});

describe("storage", () => {
  it("creates a public kits bucket and a private screenshots bucket", async () => {
    const { rows } = await db.query(`select id, public from storage.buckets order by id`);
    expect(rows).toEqual([
      { id: "kits", public: true },
      { id: "screenshots", public: false },
    ]);
  });
});

describe("combined kits", () => {
  const KEY = "b".repeat(64);
  const SOURCES_HASH = "c".repeat(64);

  async function publishedPage(path: string) {
    const lock = await startBuild(`https://example.com${path}`, `example-com${path.replace(/\//g, "-").replace(/-$/, "")}`);
    await publish(lock.kit_version_id);
    return { url: `https://example.com${path}`, versionId: lock.kit_version_id };
  }

  async function startCombined(kind: string, sources: { url: string; versionId: string }[], key = KEY, curator: string | null = null) {
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string; claimed: boolean }>(
      `select * from public.start_combined_build($1, $2, $3, $4, $5, $6, $7, $8, 1, 1)`,
      [
        kind,
        key,
        kind === "site" ? "example.com" : null,
        `${kind}-${key.slice(0, 6)}`,
        curator,
        curator ? curator.toLowerCase() : null,
        JSON.stringify(sources.map((s, i) => ({ position: i + 1, source_url: s.url, domain: "example.com", source_version_id: s.versionId }))),
        SOURCES_HASH,
      ],
    );
    return rows[0];
  }

  it("builds a site kit from published pages and records its sources", async () => {
    const sources = [await publishedPage("/"), await publishedPage("/pricing")];
    const lock = await startCombined("site", sources);
    expect(lock.claimed).toBe(true);
    expect((await startCombined("site", sources)).claimed).toBe(false);
    expect(await publish(lock.kit_version_id)).toBe(1);
    const { rows } = await db.query<{ position: number; source_url: string }>(
      `select position, source_url from public.kit_sources where kit_version_id = $1 order by position`,
      [lock.kit_version_id],
    );
    expect(rows.map((r) => r.source_url)).toEqual(["https://example.com/", "https://example.com/pricing"]);
  });

  it("refuses unpublished or single sources", async () => {
    const page = await publishedPage("/");
    const unpublished = await startBuild("https://example.com/draft", "example-com-draft");
    await expect(startCombined("site", [page, { url: "https://example.com/draft", versionId: unpublished.kit_version_id }])).rejects.toThrow(/published page kit/);
    await expect(startCombined("site", [page])).rejects.toThrow(/published page kit/);
  });

  it("keeps a taste kit's curator and needs no domain", async () => {
    const sources = [await publishedPage("/"), await publishedPage("/work")];
    const lock = await startCombined("taste", sources, KEY, "Andy");
    await publish(lock.kit_version_id);
    const { rows } = await db.query<{ kind: string; domain: string | null; curator: string }>(`select kind, domain, curator from public.kits where id = $1`, [lock.kit_id]);
    expect(rows[0]).toEqual({ kind: "taste", domain: null, curator: "Andy" });
  });

  it("rejects a page kit without a source url and a taste with a half-set curator", async () => {
    await expect(db.query(`insert into public.kits (kind, domain, slug) values ('page', 'example.com', 'x')`)).rejects.toThrow();
    await db.query(`insert into public.sites (domain) values ('example.com') on conflict do nothing`);
    await expect(db.query(`insert into public.kits (kind, sources_key, slug, curator) values ('taste', $1, 'y', 'Andy')`, [KEY])).rejects.toThrow();
  });

  it("freezes sources with their version and shows them to anon once published", async () => {
    const sources = [await publishedPage("/"), await publishedPage("/about")];
    const lock = await startCombined("site", sources);
    await asRole(db, "anon", async () => {
      expect((await db.query(`select * from public.kit_sources`)).rows).toHaveLength(0);
    });
    await publish(lock.kit_version_id);
    await expect(db.query(`delete from public.kit_sources where kit_version_id = $1`, [lock.kit_version_id])).rejects.toThrow(/cannot be changed/);
    await asRole(db, "anon", async () => {
      expect((await db.query(`select * from public.kit_sources`)).rows).toHaveLength(2);
      await expect(db.query(`select * from public.start_combined_build('site', $1, null, 's', null, null, '[]', $2, 1, 1)`, [KEY, SOURCES_HASH])).rejects.toThrow();
    });
  });
});
