# SEO and GEO

What the site does on its own, and what only people can do: Domain Rating
(Ahrefs DR) and authority come from other sites linking here.

## In the code

- **One canonical origin.** `https://www.livery.site` (`SITE.url`). `livery.site` redirects to it with a 308, so every canonical, sitemap entry, share link and schema id uses www.
- **Metadata per page** (`lib/seo/metadata.ts`): a unique, keyword-led title and description, a self-canonical, and Open Graph and Twitter cards with a share image from `/og`.
- **Kit pages:**
  - every version's canonical is the newest public version (versions never compete);
  - withdrawn versions are `noindex`;
  - each kit has a share image drawn from its own palette (`opengraph-image.tsx`);
  - an `alternate` link to its `SKILL.md` for AI readers;
  - schema.org `CreativeWork` and breadcrumbs (`lib/seo/kit.ts`);
  - a Similar Kits section for internal links.
- **Structured data** (`lib/seo/schema.ts`):
  - on every page, Organization, WebSite (with a site search box) and WebApplication;
  - FAQPage on the homepage and `/faq`;
  - HowTo on `/how-it-works` and `/agents`;
  - TechArticle on guides;
  - breadcrumbs everywhere.
- **Sitemap** (`app/sitemap.ts`): every public page, every guide, and each kit once (its newest public version, with its publish date).
- **robots.txt** (`app/robots.ts`): open to search engines and, by name, to AI search and answer crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and others). Private areas are closed.
- **GEO:**
  - `/llms.txt` (a map of Livery for language models);
  - `/llms-full.txt` (definition, how it works, FAQs, guides and every kit with its `SKILL.md`);
  - a one-sentence definition (`SITE.definition`) used in the homepage, schema and llms.txt;
  - guides that open with a quotable short answer.
- **Content:** `/guides` (data in `lib/seo/guides.ts`). Add a guide by adding an entry; it appears in the hub, the sitemap and llms-full.txt.
- **Backlink engine:** every kit page offers a "Design kit on Livery" badge (`/k/<slug>/badge.svg`) as HTML and Markdown for site owners and developers to embed.

## Off the site (do these; they move DR)

Ranked by impact for a developer tool:

1. **Google Search Console and Bing Webmaster Tools.**
   - Verify `www.livery.site`, submit `https://www.livery.site/sitemap.xml`, and request indexing of the homepage, `/explore` and `/guides`.
   - Bing also feeds ChatGPT search and Copilot.
2. **Launches with dofollow links:** Product Hunt, Hacker News (Show HN: "Turn any website into a design system for Claude Code"), Indie Hackers, Uneed, Peerlist, DevHunt, Microlaunch.
3. **AI and dev-tool directories:** There's An AI For That, Futurepedia, Toolify, AI Tools Directory, SaaSHub, AlternativeTo (as an alternative to hand-writing design systems), Awesome lists on GitHub (awesome-claude-code, awesome-cursorrules, awesome-design-systems, awesome-mcp-servers if relevant). Open a PR to each with one honest line.
4. **The extension:** the Chrome Web Store listing links to the homepage; ask early users for reviews.
5. **GitHub:** a public repo or a `livery-kits` examples repo with a README linking to kits; developers star and link to it.
6. **Write where developers read:** dev.to, Hashnode and Medium cross-posts of each guide (with a canonical link back to the guide), a Reddit post in r/ClaudeAI, r/cursor and r/webdev showing a before/after.
7. **The badge:** tell people whose sites have kits; every badge is a link from a relevant site.
8. **X:** share kits of well-known sites with their share image (the palette shows in the card), tagging the site's makers; quote-posts and links follow.
9. **Keep publishing guides:** one a month, each answering a real search ("tailwind design tokens for AI", "claude code skills examples", "make v0 / bolt / lovable apps look custom").

## Check it

- Rich results: https://search.google.com/test/rich-results (homepage, a kit, a guide, `/faq`).
- Share cards: paste a kit URL into X, Slack or https://www.opengraph.xyz.
- Ahrefs Webmaster Tools (free for your own site): site audit plus DR and backlink tracking.
