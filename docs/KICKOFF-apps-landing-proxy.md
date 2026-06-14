# Kickoff prompt — apps landing proxy + onboarding listing/instructions

Paste the block below into a fresh Claude Code session opened in the `tokans/website`
repo. The authoritative spec is `docs/PLAN-apps-landing-proxy.md`.

---

Implement the feature specified in `docs/PLAN-apps-landing-proxy.md` in this repo
(`tokans/website`). Read that file first — it is the authoritative spec.

Summary of what to build:

1. Add a `site_url` column to the `apps` table and thread it end-to-end (AppRow,
   AppListing, mapAppRow, every SELECT/RETURNING, the register payload, and the
   snapshot). Run the schema apply + `npm run snapshot:rebuild` after.

2. Add a runtime serverless proxy so `tokans.org/apps/{slug}` serves each *listed*
   app's `site_url` with the URL staying on tokans.org. Use two `vercel.json`
   rewrites (`/apps/:slug` and `/apps/:slug/(.*)`) funnelling into ONE new router
   route `app-proxy` → new `server/apps/proxy.ts` (resolve app by slug via
   `readAppsSnapshot()`→DB fallback; SSRF-guard https-only / no-private-hosts; fetch
   `site_url`+path forwarding Range/conditional headers; stream bytes back). The
   router only matches fixed-length segments — that's why slug+tail go through query
   params.

3. Link `/apps` directory cards to `/apps/{slug}` in `public/js/apps.js` (make the
   app NAME the link to avoid nested anchors with the existing `repo ↗`).

4. Wire builder onboarding (`server/onboarding/complete.ts`) so a provided URL upserts
   an `apps` row: URLs under `https://github.com/tokans/…` or `https://tokans.github.io/…`
   are listed immediately (derive the Pages `site_url`); any other URL is created as
   `requested` and emails an approval link to `tokans.org@gmail.com`
   (env `APP_APPROVAL_EMAIL`), subject "Action Required: app added", using the existing
   Redis-token pattern. Clicking it (new `server/apps/approve.ts` + router route) lists
   the app.

5. Add `src/screens/SiteSetupInstructions.tsx` and render it on the builder onboarding
   done screen (`src/screens/JourneyFlow.tsx`), showing GitHub-Pages-enable steps for a
   repo/ghpages URL or custom-domain CNAME/DNS steps (incl. the GoDaddy locked-A /
   forwarding gotcha) derived from the entered URL.

Constraints: work on a branch (never `main`); keep everything in one serverless
function (Vercel Hobby 12-fn limit); reuse `parseGithubUrl`/`domainFromUrl`
(`server/lib/scraper.ts`), `slugify`/`mapAppRow` (`server/lib/apps.ts`), `sendEmail`
(`server/lib/email.ts`), and the website-verify Redis-token pattern
(`server/auth/verify-website.ts`). The onboarding field label was already updated.
Verify per the spec's Verification section (`npm run build`, apply schema, seed,
snapshot rebuild, `vercel dev`, visit `/apps/myfinance`). Already-done in the parent
session (do NOT redo): the `src/screens/OnboardingSteps.tsx:195` label change.
