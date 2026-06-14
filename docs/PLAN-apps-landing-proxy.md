# Plan: tokans.org/apps/{slug} app landing proxy + onboarding listing/instructions

> Authoritative implementation spec. A kickoff prompt for a fresh session is in
> `docs/KICKOFF-apps-landing-proxy.md`.

## Context

The tokans website (this repo: Vercel + Neon + Upstash) has a public `/apps`
directory but no per-app landing entry. We want:

1. **`tokans.org/apps/{slug}`** to serve each *listed* app's real landing page (e.g.
   myFinance's GitHub Pages site) **as a runtime serverless proxy** — the browser URL
   stays on `tokans.org` (chosen over redirect / build-time rewrites).
2. **Builder onboarding** to turn the URL a builder enters into an app listing:
   - URL under `https://github.com/tokans/…` (tokans-owned) → **list immediately**.
   - otherwise → create the app as *requested* and **email an approval link** to the
     admin; clicking it lists the app.
3. The onboarding **done screen** to show the builder the **CNAME / GitHub Pages setup
   steps** tailored to the URL they entered.

Already done in the parent session (do NOT redo): the onboarding field label at
`src/screens/OnboardingSteps.tsx:195` → "Your website / landing page URL OR github
repo / ghpages URL".

Approval recipient is **`tokans.org@gmail.com`** (confirmed). Use env
`APP_APPROVAL_EMAIL` defaulting to `tokans.org@gmail.com`.

---

## Part 1 — Data model: add `site_url` (the proxy target)

`apps` has no landing-URL column. Add one (append-only, matches existing
`ALTER … ADD COLUMN IF NOT EXISTS` pattern):

- `schema.apps.sql`: `ALTER TABLE apps ADD COLUMN IF NOT EXISTS site_url TEXT;`
- `server/lib/apps.ts`: add `site_url: string | null` to `AppRow`; `siteUrl: row.site_url` in `mapAppRow`.
- `server/lib/backend/contract.ts`: add `siteUrl: string | null` to `AppListing`.
- Add `site_url` to every column list (SELECT/RETURNING) that projects apps:
  `server/apps/index.ts` (GET + POST), `server/apps/[id].ts` (GET),
  `server/lib/backend/mock.ts` (requestAppSupport RETURNING), `server/lib/snapshot.ts` (buildAppsSnapshot SELECT).
- Register payload: add `siteUrl?` to `RegisterBody` (`server/apps/index.ts`) and
  `AppRegisterBody` (`src/lib/types.ts`); include `site_url` in the INSERT.
- After migration: `npm run snapshot:rebuild` so the cached snapshot carries `siteUrl`.

## Part 2 — Runtime proxy `tokans.org/apps/{slug}` (one serverless function)

The router (`api/router.ts`) matches **fixed-length** segments only (no catch-all), so
capture slug + tail into query params via rewrites that funnel into the existing router
function (keeps us under the Vercel Hobby 12-function limit).

- `vercel.json` rewrites (these apply after the filesystem check, so the static `/apps`
  directory page is unaffected; only deeper paths hit the proxy):
  ```json
  { "source": "/apps/:slug",      "destination": "/api/router?__route=app-proxy&slug=:slug&path=" },
  { "source": "/apps/:slug/(.*)", "destination": "/api/router?__route=app-proxy&slug=:slug&path=$1" }
  ```
- `api/router.ts`: import + register `{ segs: ["app-proxy"], handler: appProxy }`.
- **New** `server/apps/proxy.ts` (wrapped in `withErrorHandling`):
  1. Read `slug`, `path` from `req.query`.
  2. Resolve the app: `readAppsSnapshot()` → find by slug among listed apps;
     fallback `SELECT site_url FROM apps WHERE slug=… AND listed=TRUE`. 404 if absent/no `site_url`.
  3. **SSRF guard**: target must be `https:`; reject private/loopback/link-local hosts
     (reuse `domainFromUrl` from `server/lib/scraper.ts`; real targets are public Pages/approved domains).
  4. Build target = `site_url` joined with `path` (+ forward the original query string).
  5. `fetch` (pattern from `scraper.ts` `fetchText`: UA header, `AbortSignal.timeout`),
     forwarding `Range` / `If-None-Match` / `If-Modified-Since`.
  6. Stream back: copy `Content-Type`, `Content-Length`, `Accept-Ranges`, `Content-Range`,
     `ETag`, `Cache-Control`; `res.status(upstream.status)`; `res.end(Buffer.from(await r.arrayBuffer()))`.
  - `maxDuration: 10` (existing) covers the ~1 MB demo asset. Relative asset/`release-notes.md`
    requests resolve under `/apps/{slug}/…` and are caught by the second rewrite — no HTML rewriting needed.

## Part 3 — Link `/apps` directory cards to the proxy

- `public/js/apps.js` `appRowHTML`: link to `/apps/{slug}`. **Avoid nested anchors** (the card
  already contains a `repo ↗` `<a>`): make the app **name** (`<strong>`) the link
  (`<a href="/apps/${escapeHtml(slug)}">`), leave the `repo ↗` link as-is. The carousel
  (`public/js/carousel.js`) tracks `.deck-slide` only, so inner links are safe.

## Part 4 — Onboarding submit → create/list app or email approval

In the builder onboarding completion (`server/onboarding/complete.ts`, where `websiteUrl`
context is already parsed), after the existing ownership-verification logic, upsert an `apps`
row for the owner when a URL was provided:

- `TRUSTED_PREFIXES = ["https://github.com/tokans/", "https://tokans.github.io/"]`
  (both tokans-owned).
- Derive listing fields:
  - `github.com/tokans/<repo>` → `site_url = https://tokans.github.io/<repo>/` (Pages URL;
    preserve repo case in the path), `name=<repo>`, `slug=slugify(<repo>)`, **listed=TRUE**.
  - `tokans.github.io/<repo>` → use entered URL as `site_url`, **listed=TRUE**.
  - otherwise → `site_url = entered URL`, **listed=FALSE**, `support_status='requested'`.
  - reuse `parseGithubUrl` / `slugify` (`server/lib/scraper.ts`, `server/lib/apps.ts`).
- Upsert: `INSERT INTO apps (owner_user_id, slug, name, site_url, repo_url, listed, support_status) … ON CONFLICT (slug) DO UPDATE`.
- **Approval flow** for the non-trusted branch — mirror the existing website-verify token pattern
  (`issueAndSendToken` in `server/onboarding/complete.ts` + `server/auth/verify-website.ts`):
  - store `{appId}` in Redis under `app_approve:<token>` (TTL), email `APP_APPROVAL_EMAIL`
    (default `tokans.org@gmail.com`) via `server/lib/email.ts` `sendEmail`, subject
    **"Action Required: app added"**, body with an **approve button** →
    `/api/apps/approve?token=…`.
  - **New** `server/apps/approve.ts` + router route: validate token → `UPDATE apps SET
    listed=TRUE, support_status='listed'` → trigger snapshot rebuild (or rely on cron) →
    redirect to `/apps`. Token is single-use (delete after).

## Part 5 — Post-submit setup instructions (done screen)

- **New** `src/screens/SiteSetupInstructions.tsx`: pure component, input = the entered URL,
  renders tailored steps:
  - `github.com/<owner>/<repo>` or `<owner>.github.io/<repo>` → **Enable GitHub Pages**
    (Settings → Pages → branch `gh-pages` / root), show resulting `https://<owner>.github.io/<repo>/`,
    plus optional **custom-domain** CNAME steps.
  - custom domain → **DNS steps**: add `CNAME` host → Pages host; remove any conflicting
    **locked A / forwarding** record first (the GoDaddy gotcha), add the `CNAME` file /
    set Pages custom domain, enforce HTTPS.
- Render it on the builder journeys' **done** screen (`src/screens/JourneyFlow.tsx`, ~lines 82–120),
  fed `context.websiteUrl`, gated to `role === "builder"` with a URL present.

---

## Security

- Proxy serves **listed apps only**; `https`-only targets; private/loopback hosts blocked; fetch timeout.
- Approval link: possession of the emailed Redis token = authorization; single-use + TTL.

## Files (grouped)

- **DB/model:** `schema.apps.sql`, `server/lib/apps.ts`, `server/lib/backend/contract.ts`,
  `server/apps/index.ts`, `server/apps/[id].ts`, `server/lib/backend/mock.ts`, `server/lib/snapshot.ts`, `src/lib/types.ts`
- **Proxy:** `vercel.json`, `api/router.ts`, **new** `server/apps/proxy.ts`
- **Directory link:** `public/js/apps.js`
- **Onboarding wiring + approval:** `server/onboarding/complete.ts`, **new** `server/apps/approve.ts`,
  `api/router.ts`, `server/lib/email.ts` (add approval-email html), env `APP_APPROVAL_EMAIL`
- **Instructions UI:** **new** `src/screens/SiteSetupInstructions.tsx`, `src/screens/JourneyFlow.tsx`

## Verification

1. `npm run build` (vite + `tsc`) passes (type gate).
2. Apply schema (`scripts/apply-schema.mjs`) → `site_url` column exists;
   `npm run seed:apps` (set `site_url` for my* apps) → `npm run snapshot:rebuild`.
3. `vercel dev` (or `npm run local`): visit `/apps/myfinance` → proxied landing page renders under
   the tokans.org URL; `/apps/myfinance/assets/demo.mp4` and `release-notes.md` load.
4. Onboarding: enter `https://github.com/tokans/myFinance` → app auto-listed, card links to
   `/apps/myfinance`, done screen shows GitHub Pages steps. Enter a custom domain → approval email
   sent; clicking the link lists the app.
5. (Optional) add a unit test for `appRowHTML` link output and `SiteSetupInstructions` URL→steps
   (no test harness exists today; `appRowHTML` is already exported "for tests").

## Notes

- Repo conventions: work on a branch (never `main`); don't commit unless asked.
- `tokans.github.io/*` is auto-trusted alongside `github.com/tokans/*` (same org) — drop it from
  `TRUSTED_PREFIXES` if not wanted.
