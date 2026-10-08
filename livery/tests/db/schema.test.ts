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
  it("creates public kits and covers buckets and a private screenshots bucket", async () => {
    const { rows } = await db.query(`select id, public from storage.buckets order by id`);
    expect(rows).toEqual([
      { id: "covers", public: true },
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

  it("lets an admin publish a taste's next version from new sources", async () => {
    const [a, b, c] = [await publishedPage("/"), await publishedPage("/work"), await publishedPage("/about")];
    const first = await startCombined("taste", [a, b], KEY, "Andy");
    await publish(first.kit_version_id);
    const NEXT = "d".repeat(64);
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string; claimed: boolean }>(
      `select * from public.start_combined_version($1, $2, $3, $4, 1, 1)`,
      [first.kit_id, NEXT, JSON.stringify([a, b, c].map((s, i) => ({ position: i + 1, source_url: s.url, domain: "example.com", source_version_id: s.versionId }))), SOURCES_HASH],
    );
    expect(rows[0]).toMatchObject({ kit_id: first.kit_id, claimed: true });
    expect(await publish(rows[0].kit_version_id)).toBe(2);
    const { rows: kit } = await db.query<{ sources_key: string }>(`select sources_key from public.kits where id = $1`, [first.kit_id]);
    expect(kit[0].sources_key).toBe(NEXT);
  });

  it("keeps admin fields on kits and a public covers bucket", async () => {
    await db.query(`insert into public.sites (domain) values ('example.com') on conflict do nothing`);
    await expect(db.query(`insert into public.kits (source_url, domain, slug, cover_path) values ('https://example.com/x', 'example.com', 'x', '../evil.png')`)).rejects.toThrow();
    const { rows } = await db.query<{ public: boolean }>(`select public from storage.buckets where id = 'covers'`);
    expect(rows[0].public).toBe(true);
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

describe("kit stats", () => {
  const h = (c: string) => c.repeat(64);
  async function kit() {
    const lock = await startBuild();
    await publish(lock.kit_version_id);
    return lock.kit_id;
  }
  const record = async (kitId: string, kind: string, visitor: string, network: string) =>
    (await db.query<{ record_kit_event: boolean }>(`select public.record_kit_event($1, $2, $3, $4)`, [kitId, kind, visitor, network])).rows[0].record_kit_event;
  const stats = async (kitId: string) => (await db.query<{ views: number; likes: number; downloads: number }>(`select views, likes, downloads from public.kit_stats where kit_id = $1`, [kitId])).rows[0];

  it("counts each person once, however often they click", async () => {
    const id = await kit();
    expect(await record(id, "view", h("a"), h("1"))).toBe(true);
    expect(await record(id, "view", h("a"), h("1"))).toBe(false);
    expect(await record(id, "view", h("b"), h("2"))).toBe(true);
    expect(await stats(id)).toEqual({ views: 2, likes: 0, downloads: 0 });
  });

  it("doesn't count again when only the cookie changes on the same network and browser", async () => {
    const id = await kit();
    await record(id, "download", h("a"), h("1"));
    expect(await record(id, "download", h("c"), h("1"))).toBe(false);
    expect((await stats(id)).downloads).toBe(1);
  });

  it("lets a like be taken back", async () => {
    const id = await kit();
    await record(id, "like", h("a"), h("1"));
    expect((await stats(id)).likes).toBe(1);
    await db.query(`select public.remove_like($1, $2, $3)`, [id, h("a"), h("1")]);
    expect((await stats(id)).likes).toBe(0);
  });

  it("lists one row per kit, its newest version, with its totals", async () => {
    const id = await kit();
    const next = await startBuild();
    await publish(next.kit_version_id);
    await record(id, "like", h("a"), h("1"));
    await asRole(db, "anon", async () => {
      const { rows } = await db.query<{ version: number; likes: number }>(`select version, likes from public.kit_library where kit_id = $1`, [id]);
      expect(rows).toEqual([{ version: 2, likes: 1 }]);
    });
  });

  it("names colour families for filtering", async () => {
    const { rows } = await db.query<{ f: string }>(`select public.colour_family(x) as f from unnest(array['#0d7268','#ff7a00','#2563eb','#47ab61','#777777','#e11d48', null]) as x`);
    expect(rows.map((r) => r.f)).toEqual(["teal", "orange", "blue", "green", "neutral", "red", null]);
  });

  it("shows totals to anon but never the events", async () => {
    const id = await kit();
    await record(id, "view", h("a"), h("1"));
    await asRole(db, "anon", async () => {
      expect((await db.query(`select views from public.kit_stats where kit_id = $1`, [id])).rows).toEqual([{ views: 1 }]);
      await expect(db.query(`select * from public.kit_events`)).rejects.toThrow();
      await expect(db.query(`select public.record_kit_event($1, 'view', $2, $3)`, [id, h("d"), h("4")])).rejects.toThrow();
    });
  });
});

describe("accounts", () => {
  async function user(meta: object = {}) {
    const { rows } = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('a@example.com', $1) returning id`, [JSON.stringify(meta)]);
    return rows[0].id;
  }

  it("creates a profile from the provider's name and avatar", async () => {
    const id = await user({ full_name: "Andy Marrow", avatar_url: "https://avatars.example.com/a.png" });
    const { rows } = await db.query(`select display_name, avatar_url from public.profiles where id = $1`, [id]);
    expect(rows[0]).toEqual({ display_name: "Andy Marrow", avatar_url: "https://avatars.example.com/a.png" });
  });

  it("refuses a non-https avatar", async () => {
    const id = await user({ name: "B", avatar_url: "javascript:alert(1)" });
    const { rows } = await db.query<{ avatar_url: string | null }>(`select avatar_url from public.profiles where id = $1`, [id]);
    expect(rows[0].avatar_url).toBeNull();
  });

  it("keeps profiles and saved kits private to their owner", async () => {
    const [a, b] = [await user({ name: "A" }), await user({ name: "B" })];
    const lock = await startBuild();
    await publish(lock.kit_version_id);
    await asRole(db, "authenticated", async () => {
      await db.query(`insert into public.saved_kits (user_id, kit_id) values ($1, $2)`, [a, lock.kit_id]);
      await expect(db.query(`insert into public.saved_kits (user_id, kit_id) values ($1, $2)`, [b, lock.kit_id])).rejects.toThrow();
      expect((await db.query(`select * from public.profiles`)).rows).toHaveLength(1);
      expect((await db.query(`select * from public.saved_kits`)).rows).toHaveLength(1);
    }, a);
    await asRole(db, "authenticated", async () => {
      expect((await db.query(`select * from public.saved_kits`)).rows).toHaveLength(0);
      expect((await db.query<{ display_name: string }>(`select display_name from public.profiles`)).rows).toEqual([{ display_name: "B" }]);
    }, b);
    await asRole(db, "anon", async () => {
      await expect(db.query(`select * from public.profiles`)).rejects.toThrow();
    });
  });
});

describe("ownership and private kits", () => {
  const KEY = "e".repeat(64);
  async function user() {
    const { rows } = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('u@example.com', '{}') returning id`);
    return rows[0].id;
  }
  async function page(path: string, owner: string | null = null) {
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string }>(
      `select * from public.start_build($1, 'example.com', $2, 1, 1, interval '10 minutes', $3)`,
      [`https://example.com${path}`, `example-com${path.replace(/\//g, "-").replace(/-$/, "")}`, owner],
    );
    await publish(rows[0].kit_version_id);
    return { url: `https://example.com${path}`, versionId: rows[0].kit_version_id, kitId: rows[0].kit_id };
  }
  async function privateCombined(owner: string) {
    const sources = [await page("/a"), await page("/b")];
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string }>(
      `select * from public.start_combined_build('site', $1, 'example.com', 'example-com-pages-eeeeee', null, null, $2, $3, 1, 1, interval '10 minutes', $4, 'private')`,
      [KEY, JSON.stringify(sources.map((s, i) => ({ position: i + 1, source_url: s.url, domain: "example.com", source_version_id: s.versionId }))), HASH, owner],
    );
    await publish(rows[0].kit_version_id);
    return rows[0];
  }

  it("gives a kit to whoever builds it first, and never changes that", async () => {
    const [a, b] = [await user(), await user()];
    const first = await page("/", a);
    await db.query(`select * from public.start_build('https://example.com/', 'example.com', 'example-com', 1, 1, interval '10 minutes', $1)`, [b]);
    const { rows } = await db.query<{ owner_id: string }>(`select owner_id from public.kits where id = $1`, [first.kitId]);
    expect(rows[0].owner_id).toBe(a);
  });

  it("hides a private version from everyone but its owner, and from the library", async () => {
    const [owner, other] = [await user(), await user()];
    const kit = await privateCombined(owner);
    const { rows: key } = await db.query<{ private_key: string }>(`select private_key from public.kit_versions where id = $1`, [kit.kit_version_id]);
    expect(key[0].private_key).toMatch(/^[0-9a-f]{32}$/);
    const visible = () => db.query(`select id from public.kit_versions where id = $1`, [kit.kit_version_id]).then((r) => r.rows.length);
    await asRole(db, "anon", async () => {
      expect(await visible()).toBe(0);
      expect((await db.query(`select * from public.kit_library where kit_id = $1`, [kit.kit_id])).rows).toHaveLength(0);
    });
    await asRole(db, "authenticated", async () => expect(await visible()).toBe(0), other);
    await asRole(db, "authenticated", async () => {
      expect(await visible()).toBe(1);
      expect((await db.query(`select * from public.kit_library where kit_id = $1`, [kit.kit_id])).rows).toHaveLength(0);
    }, owner);
  });

  it("publishes one way only, changing nothing else", async () => {
    const owner = await user();
    const kit = await privateCombined(owner);
    await expect(db.query(`update public.kit_versions set visibility = 'public', skill_md = 'changed' where id = $1`, [kit.kit_version_id])).rejects.toThrow(/cannot be changed/);
    await db.query(`update public.kit_versions set visibility = 'public' where id = $1`, [kit.kit_version_id]);
    await expect(db.query(`update public.kit_versions set visibility = 'private' where id = $1`, [kit.kit_version_id])).rejects.toThrow(/cannot be changed/);
    await asRole(db, "anon", async () => {
      expect((await db.query(`select * from public.kit_library where kit_id = $1`, [kit.kit_id])).rows).toHaveLength(1);
    });
  });
});

describe("extension captures", () => {
  async function user() {
    const { rows } = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('x@example.com', '{}') returning id`);
    return rows[0].id;
  }
  async function capture(owner: string) {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.page_captures (owner_id, url, host, domain, viewport_width, viewport_height, data) values ($1, 'https://app.example.com/dashboard', 'app.example.com', 'example.com', 1440, 900, '{}') returning id`,
      [owner],
    );
    return rows[0].id;
  }
  async function ownedKit(owner: string) {
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string }>(`select * from public.start_build('https://example.com/', 'example.com', 'example-com', 1, 1, interval '10 minutes', $1)`, [owner]);
    await publish(rows[0].kit_version_id);
    return rows[0];
  }
  const ownerVersion = (kitId: string, owner: string, sources: object[]) =>
    db.query<{ kit_version_id: string; claimed: boolean }>(`select * from public.start_owner_version($1, $2, $3, $4, 1, 1)`, [kitId, owner, JSON.stringify(sources), HASH]);

  it("builds a private next version from the page and the owner's capture", async () => {
    const owner = await user();
    const kit = await ownedKit(owner);
    const cap = await capture(owner);
    const { rows } = await ownerVersion(kit.kit_id, owner, [
      { position: 1, source_url: "https://example.com/", domain: "example.com", source_version_id: kit.kit_version_id },
      { position: 2, source_url: "https://app.example.com/dashboard", domain: "example.com", capture_id: cap },
    ]);
    expect(rows[0].claimed).toBe(true);
    const { rows: v } = await db.query<{ visibility: string; private_key: string }>(`select visibility, private_key from public.kit_versions where id = $1`, [rows[0].kit_version_id]);
    expect(v[0].visibility).toBe("private");
    expect(v[0].private_key).toMatch(/^[0-9a-f]{32}$/);
  });

  it("refuses someone else's kit or someone else's capture", async () => {
    const [owner, stranger] = [await user(), await user()];
    const kit = await ownedKit(owner);
    const theirs = await capture(stranger);
    await expect(ownerVersion(kit.kit_id, stranger, [{ position: 1, source_url: "https://example.com/", domain: "example.com", source_version_id: kit.kit_version_id }])).rejects.toThrow(/not owned/);
    await expect(ownerVersion(kit.kit_id, owner, [{ position: 1, source_url: "https://app.example.com/dashboard", domain: "example.com", capture_id: theirs }])).rejects.toThrow(/your own capture/);
  });

  it("keeps captures and tokens private to their owner", async () => {
    const [owner, other] = [await user(), await user()];
    await capture(owner);
    await db.query(`insert into public.extension_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval '90 days')`, [owner, "f".repeat(64)]);
    await asRole(db, "authenticated", async () => {
      expect((await db.query(`select * from public.page_captures`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.extension_tokens`)).rows).toHaveLength(0);
    }, other);
    await asRole(db, "authenticated", async () => {
      expect((await db.query(`select * from public.page_captures`)).rows).toHaveLength(1);
    }, owner);
    await asRole(db, "anon", async () => {
      await expect(db.query(`select * from public.page_captures`)).rejects.toThrow();
    });
  });
});

describe("deleting an account", () => {
  it("removes private kits and unused captures, keeps what was published (without its owner)", async () => {
    const { rows: u } = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('gone@example.com', '{}') returning id`);
    const owner = u[0].id;
    const capture = async () =>
      (await db.query<{ id: string }>(`insert into public.page_captures (owner_id, url, host, domain, viewport_width, viewport_height, data, frame_path) values ($1, 'https://app.gone.dev/x', 'app.gone.dev', 'gone.dev', 1440, 900, '{}', 'captures/x.webp') returning id`, [owner])).rows[0].id;
    // A public page kit they built, then two private versions on top of it, the second published.
    const { rows: base } = await db.query<{ kit_id: string; kit_version_id: string }>(`select * from public.start_build('https://gone.dev/', 'gone.dev', 'gone-dev', 1, 1, interval '10 minutes', $1)`, [owner]);
    await publish(base[0].kit_version_id);
    const next = async (cap: string, hash: string) => {
      const { rows } = await db.query<{ kit_version_id: string }>(`select * from public.start_owner_version($1, $2, $3, $4, 1, 1)`, [base[0].kit_id, owner, JSON.stringify([
        { position: 1, source_url: "https://gone.dev/", domain: "gone.dev", source_version_id: base[0].kit_version_id },
        { position: 2, source_url: "https://app.gone.dev/x", domain: "gone.dev", capture_id: cap },
      ]), hash]);
      await publish(rows[0].kit_version_id);
      return rows[0].kit_version_id;
    };
    const [privateCap, publicCap] = [await capture(), await capture()];
    const privateVersion = await next(privateCap, "1".repeat(64));
    const publishedVersion = await next(publicCap, "2".repeat(64));
    await db.query(`update public.kit_versions set visibility = 'public' where id = $1`, [publishedVersion]);
    // A private-only kit, which should disappear entirely.
    const { rows: mine } = await db.query<{ id: string }>(`insert into public.kits (kind, domain, slug, owner_id, sources_key) values ('site', 'gone.dev', 'gone-dev-mine-abc123', $1, $2) returning id`, [owner, "9".repeat(64)]);
    const { rows: lone } = await db.query<{ kit_version_id: string }>(`select * from public.start_owner_version($1, $2, $3, $4, 1, 1)`, [mine[0].id, owner, JSON.stringify([{ position: 1, source_url: "https://app.gone.dev/x", domain: "gone.dev", capture_id: privateCap }]), "3".repeat(64)]);
    await publish(lone[0].kit_version_id);

    const { rows } = await asRole(db, "service_role", () => db.query<{ kit_files: string[]; frame_folders: string[]; frame_files: string[] }>(`select * from public.delete_account($1)`, [owner]));
    expect(rows[0].frame_folders.sort()).toEqual([privateVersion, lone[0].kit_version_id].sort());
    expect(rows[0].frame_files).toEqual(["captures/x.webp"]);
    await db.query(`delete from auth.users where id = $1`, [owner]);

    const left = async (table: string, id: string) => (await db.query(`select 1 from public.${table} where id = $1`, [id])).rows.length;
    expect(await left("kit_versions", privateVersion)).toBe(0);
    expect(await left("kit_versions", lone[0].kit_version_id)).toBe(0);
    expect(await left("kits", mine[0].id)).toBe(0);
    expect(await left("page_captures", privateCap)).toBe(0);
    expect(await left("kit_versions", publishedVersion)).toBe(1);
    expect(await left("kit_versions", base[0].kit_version_id)).toBe(1);
    expect(await left("page_captures", publicCap)).toBe(1);
    const { rows: kit } = await db.query<{ owner_id: string | null }>(`select owner_id from public.kits where id = $1`, [base[0].kit_id]);
    expect(kit[0].owner_id).toBeNull();
    // The guards are back on.
    await expect(db.query(`delete from public.kit_versions where id = $1`, [publishedVersion])).rejects.toThrow(/withdraw it/);
  });

  it("can't be called by signed-in users", async () => {
    await asRole(db, "authenticated", async () => {
      await expect(db.query(`select * from public.delete_account(gen_random_uuid())`)).rejects.toThrow(/permission denied/);
    });
  });
});

describe("admin moderation", () => {
  const sourcesOf = (versions: { url: string; versionId: string }[]) => JSON.stringify(versions.map((v, i) => ({ position: i + 1, source_url: v.url, domain: "mod.dev", source_version_id: v.versionId })));
  async function page(path: string) {
    const { rows } = await db.query<{ kit_id: string; kit_version_id: string }>(`select * from public.start_build($1, 'mod.dev', $2, 1, 1)`, [`https://mod.dev${path}`, `mod-dev${path.replace(/\//g, "-").replace(/-$/, "")}`]);
    await publish(rows[0].kit_version_id);
    return { url: `https://mod.dev${path}`, versionId: rows[0].kit_version_id, kitId: rows[0].kit_id };
  }

  it("deletes a kit with its published versions, but not one a taste is built from", async () => {
    const [a, b] = [await page("/a"), await page("/b")];
    const { rows: combined } = await db.query<{ kit_id: string; kit_version_id: string }>(
      `select * from public.start_combined_build('taste', $1, null, 'taste-mod-111111', 'Mod', 'mod', $2, $3, 1, 1)`,
      ["c".repeat(64), sourcesOf([a, b]), "d".repeat(64)],
    );
    await publish(combined[0].kit_version_id);

    await expect(asRole(db, "service_role", () => db.query(`select * from public.admin_delete_kit($1)`, [a.kitId]))).rejects.toThrow(/used by taste-mod-111111/);

    const { rows } = await asRole(db, "service_role", () => db.query<{ frame_folders: string[] }>(`select * from public.admin_delete_kit($1)`, [combined[0].kit_id]));
    expect(rows[0].frame_folders).toEqual([combined[0].kit_version_id]);
    await asRole(db, "service_role", () => db.query(`select * from public.admin_delete_kit($1)`, [a.kitId]));
    expect((await db.query(`select 1 from public.kits where id = any($1)`, [[a.kitId, combined[0].kit_id]])).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.kit_versions where id = $1`, [a.versionId])).rows).toHaveLength(0);
    // Untouched kits stay, and their guards are back on.
    await expect(db.query(`delete from public.kit_versions where id = $1`, [b.versionId])).rejects.toThrow(/withdraw it/);
  });

  it("keeps the audit log and the delete function away from signed-in users", async () => {
    await asRole(db, "authenticated", async () => {
      await expect(db.query(`select * from public.admin_audit`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.admin_delete_kit(gen_random_uuid())`)).rejects.toThrow(/permission denied/);
    });
  });
});

describe("bigger tastes", () => {
  it("lets a kit hold up to 12 sources, and no more", async () => {
    const pages: { url: string; versionId: string }[] = [];
    for (let i = 0; i < 13; i++) {
      const { rows } = await db.query<{ kit_version_id: string }>(`select * from public.start_build($1, 'big.dev', $2, 1, 1)`, [`https://big.dev/p${i}`, `big-dev-p${i}`]);
      await publish(rows[0].kit_version_id);
      pages.push({ url: `https://big.dev/p${i}`, versionId: rows[0].kit_version_id });
    }
    const sources = (n: number) => JSON.stringify(pages.slice(0, n).map((p, i) => ({ position: i + 1, source_url: p.url, domain: "big.dev", source_version_id: p.versionId })));
    const { rows } = await db.query<{ claimed: boolean }>(`select * from public.start_combined_build('taste', $1, null, 'taste-big-121212', 'Big', 'big', $2, $3, 1, 1)`, ["e".repeat(64), sources(12), "f".repeat(64)]);
    expect(rows[0].claimed).toBe(true);
    await expect(db.query(`select * from public.start_combined_build('taste', $1, null, 'taste-big-131313', 'Big', 'big', $2, $3, 1, 1)`, ["a".repeat(64), sources(13), "b".repeat(64)])).rejects.toThrow(/position_check/);
  });
});

describe("server role", () => {
  it("can run every build function the server calls (as service_role, not the test superuser)", async () => {
    const page = async (path: string) => {
      const { rows } = await asRole(db, "service_role", () => db.query<{ kit_version_id: string }>(`select * from public.start_build($1, 'example.com', $2, 1, 1)`, [`https://example.com${path}`, `example-com${path.replace(/\//g, "-").replace(/-$/, "")}`]));
      await asRole(db, "service_role", () => publish(rows[0].kit_version_id));
      return { url: `https://example.com${path}`, versionId: rows[0].kit_version_id };
    };
    const sources = [await page("/a"), await page("/b")];
    const payload = JSON.stringify(sources.map((s, i) => ({ position: i + 1, source_url: s.url, domain: "example.com", source_version_id: s.versionId })));
    const { rows } = await asRole(db, "service_role", () =>
      db.query<{ claimed: boolean }>(`select * from public.start_combined_build('site', $1, 'example.com', 'example-com-pages-aaaaaa', null, null, $2, $3, 1, 1, interval '10 minutes', null, 'private')`, ["a".repeat(64), payload, "b".repeat(64)]),
    );
    expect(rows[0].claimed).toBe(true);
  });
});
