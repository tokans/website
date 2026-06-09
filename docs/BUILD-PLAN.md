# tokans/website — Coding-Stage Build Plan

> **Status:** design locked, pre-code. The public front door of the Tokans ecosystem.
> Companions: [`myWorkAssistant/docs/BUILD-PLAN.md`](../../../myWorkAssistant/docs/BUILD-PLAN.md),
> [`tokans/backend/docs/BUILD-PLAN.md`](../../backend/docs/BUILD-PLAN.md).

---

## 0. Role in the ecosystem

The website is the **public front door + registry + professional onboarding**:

- Where **end-users register** and **add their vibe-coded apps**.
- Where **professionals sign up** (`/professionals`) → get profiled → assigned roles → **gated to
  download myWorkAssistant** → listed as **Partners** across the suite.
- Where the **partner network as privacy-preserving ads** is served (links to professional profiles)
  and where an end-user's **connect** action **initiates a task** that lands in a professional's
  myWorkAssistant inbox.
- Where the **signed feeds** consumed by `sharedcorelib` (masters incl. the **partner master**, the
  published-apps registry, the suite-runtime bundle) are published.

It is **not** the source of truth for workflow/UAM/Tokans — that is `tokans/backend`. The website is a
**REST/SSR edge** that calls the backend over **REST**. (gRPC is reserved for the **desktop**
myWorkAssistant app talking to the backend directly — **the web tier never uses gRPC**.)

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React + Vite, Vercel-hosted)                         │
│  tokans.org · /professionals · /founders · /hire · /join      │
│  /apps (register vibe-coded app) · partner directory (ads)    │
└───────────────┬───────────────────────────────────────────────┘
                │ REST (Vercel serverless functions)
                ▼
┌─────────────────────────────────────────────────────────────┐
│ Vercel functions (Node)                                       │
│  • auth (email/pw, GitHub, Google) + sessions (Redis)         │
│  • Neon Postgres (profiles, apps, listings, connections)      │
│  • REST client ───────────────────────────────────────────────┼──▶ tokans/backend (REST API)
│  • signed-feed publisher (masters / registry / runtime)       │     UAM · workflow · Tokans · ACIE
│                                                                │     (desktop reaches it via gRPC)
└───────────────────────────────────────────────────────────────┘
```

---

## 1. What exists today (baseline)

- React 18 + Vite + TS; **Vercel serverless functions**; **Neon Postgres**; **Upstash/Vercel KV
  (Redis)** sessions (7-day TTL, HttpOnly cookies); CSRF + rate-limit middleware.
- Auth: email/pw (bcrypt), **GitHub + Google OAuth** with account linking; `POST /api/auth/signup|signin`,
  OAuth redirect/callback pairs, `POST /api/auth/logout`, `GET /api/auth/session`, `GET /api/csrf`.
- Onboarding: `POST /api/onboarding/complete` (role, sub_type, context; rotates session).
- Tables: `users`, `user_roles`, `onboarding_data`, `activities`, `tokan_entries`, `reviews`,
  `employer_briefs`, `matches`. **No `projects`/`apps`, no partner-listing, no skill tables yet.**
- **Frontend screens largely unbuilt** (homepage, `/hire`, `/join`, `/founders`, First Tokan Task UI,
  profile cards, match/shortlist UI).

---

## 2. What to build (coding stage)

### 2.1 Screens / flows (Vike-style routes; Tailwind)
- **`/` homepage** — founder/professional positioning + download CTA (Enroll/Sign-in for the gated app).
- **`/professionals` (signup / onboarding)** — profiles profession & relevant questions (dynamic
  forms, shared manifests with the desktop app) and **registers them as a Partner** (writes to the
  partner master feed via backend). Onboarding **alone does not grant the download** — subscription does.
- **`/professionals/subscribe`** — a paid subscription that **unlocks the myWorkAssistant download +
  app-listing features** (listing features land later). Same payments gateway as `/donate`. The
  download gate requires **approved (onboarded) AND an active subscription**.
- **`/donate`** — anonymous-friendly donations (pay-it-forward; funds professional access). Redirects
  to the hosted gateway; a completed donation later issues a `sharedcorelib/grant` Patron entitlement
  (grant issuance is a later step).
- **`/founders`** — **the same flow as `/apps`** (register/list a vibe-coded app for support). It's an
  alias route → the Apps screen.
- **`/apps`** — the public **directory of all apps listed for Tokans support**. **Every app built on
  `sharedCoreLib` is eligible** to appear here (it overlaps the suite's `common:app` registry). Listing
  is **not automatic**: an **authorised app owner initiates an acceptance workflow** (BE `Workflow.NewTask`
  → review/approve → listed) to get the app accepted for support. *(Acceptance-workflow wiring is a
  later TODO.)* **Seed data = the local `C:\workspace\my*` projects** (myFinance, myHealth, … — folder
  names starting with `my`), loaded by `scripts/seed-apps.mjs` (`npm run seed:apps`, dev-only). *(Data model, §3.)*
- **Role-scoped onboarding entry points** — `/professionals`, `/join`, and `/hire` are **the same
  onboarding engine** (the existing role-based `Onboarding` + UAM role assignment), each pre-selecting
  a role + role-specific form and differing only in **post-onboarding entitlement**:
  - **`/join` — supply / Opportunity Seeker** (job-seeking engineers). Deep-links into `opportunity_seeker`
    onboarding (skips the role picker), then the **First Tokan Task**. The talent-side analogue of
    `/professionals` (which assigns the *Partner* role); same mechanism, different role + rights.
  - **`/hire` — demand / Employer** (NOT a professional signup). Deep-links into `employer` onboarding
    and persists the **7-question brief** to `employer_briefs`; the employer then receives shortlists.
  - **`/professionals`** assigns the **Partner** role (→ `/partners` listing + subscribe → desktop download).
- **Partner directory / ads** — public, privacy-preserving listings (link to tokans.org profiles); the
  same data that other suite apps pull as **Partner masters**. **No end-user PII collected to view.**
- **First Tokan Task** — 5-question anonymized peer-review UI (writes `reviews`).
- **Profile cards / Tokan breakdown** — ingest-don't-display (only Tokan scores; never raw metrics).

### 2.2 API additions (Vercel functions → backend over REST)
- `POST /api/professionals/onboard` → backend UAM (assign Role/RoleCategory `Partner`) + download grant.
- `GET  /api/professionals/download` → signed download/enroll link for myWorkAssistant (gated on an
  active subscription).
- `POST /api/donate/checkout` → create a donation checkout (anonymous OK) → `{ url }` redirect.
- `POST /api/professionals/subscribe` → create a subscription checkout → `{ url }`.
- `GET  /api/professionals/subscription` → current subscription status.
- `POST /api/payments/webhook` → verify + settle donation/subscription (gateway → DB).
- `GET  /api/apps` / `GET /api/apps/:id` → the public **support-listing directory** (apps accepted for
  Tokans support; sharedCoreLib apps eligible).
- `POST /api/apps` → register/claim an app (owner).
- `POST /api/apps/:id/request-support` → **authorised owner initiates the acceptance workflow** (BE
  `Workflow.NewTask`) to get the app accepted + listed. *(TODO later — needs BE workflow.)*
- `POST /api/employer/brief` → persist the employer 7-Q brief to `employer_briefs` (called on `/hire`
  onboarding completion; remaining questions editable later in the dashboard).
- `GET  /api/tokan-task` → next anonymised seed profile to review (First Tokan Task); `POST /api/tokan-task`
  → submit the 5 answers → award the first Tokan (writes `activities` + `tokan_entries`).
- `GET  /api/partners` → partner directory (ad listings; public, paginated, origin-safe profile links).
- `POST /api/connections` → **initiate a connection** (end-user → professional). Calls backend to
  **create a `workItem`** (NewTask) in the workflow → routed to the professional's inbox. End-user
  registers at this point (minimal account); no PII shared beyond what's needed for the task.
- `POST /api/skills` / `GET /api/skills` → **skill marketplace** listings (publish/list user-authored
  skills; backend runs the review workflow + signs distribution).
- `GET  /api/feed/*` → **signed feeds** for `sharedcorelib` suite updater: `masters` (incl. partner
  master + `common:app` registry), `runtime` bundle, `timestamp`/`snapshot` (TUF-style). Keys stay
  **offline**; the function serves pre-signed artifacts only.
- Reuse existing auth/session/CSRF; the backend REST client lives in `server/lib/backend/` (`getBackend()`
  → `MockBackend` default | `RestBackend`). **No gRPC on the web tier.**

### 2.3 Backend REST client (the web tier is REST-only)
- `server/lib/backend/` — typed `BackendPort` client: `getBackend()` → `MockBackend` (Neon-backed, default)
  | `RestBackend` (HTTP to `tokans/backend`'s REST API, env `BACKEND_REST_URL`). The browser calls the
  Vercel functions; the functions call the backend over **REST**. **No gRPC anywhere on the web tier** —
  gRPC is the desktop↔backend transport only. Auth: forward the session identity as a short-lived
  signed token in the `Authorization` header.

### 2.4 Payments — donations + subscriptions
One gateway powers both `/donate` and `/professionals/subscribe`, behind a `PaymentsPort` adapter seam
(`PAYMENTS_MODE=mock|razorpay|stripe`): a **mock** adapter (settles instantly, no setup — for dev) plus
two real adapters behind the **same interface**, so the active gateway is just an env switch:

- **Razorpay — the India-based gateway** (UPI, cards, netbanking; INR subscriptions via RBI e-mandate).
  **Primary for the India-first launch.** Razorpay Checkout / Subscriptions + webhooks.
- **Stripe Checkout** — global option (hosted, no PCI scope, callable via REST without an SDK).

- **Subscription = access.** An active subscription is the gate for the myWorkAssistant download and
  (later) app-listing features; the backend's professional status / download grant reads it.
- **Donations** are anonymous-friendly (associate a user only if signed in); a minimum amount is enforced.
- **External TODOs to go live** per gateway (account + KYC; recurring plans/Price ids; webhook secrets;
  **raw request body** for signature verification on Vercel; subscription-cancellation reconciliation;
  donation→Patron grant) are tracked in [`payments-setup.md`](payments-setup.md).
- Env: `PAYMENTS_MODE`, `PUBLIC_BASE_URL`; Razorpay → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_*`; Stripe → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_*`.

---

## 3. Data-model additions (Neon Postgres)

Append-only migrations. New tables (names indicative):

| Table | Purpose | Key fields |
|---|---|---|
| `apps` | apps listed for Tokans support (sharedCoreLib apps eligible) | id, owner_user_id, name, repo_url, stack, description, uses_sharedcorelib(bool), support_status(none\|requested\|accepted\|listed), listed(bool) |
| `partner_listings` | the ad listings served to other suite apps | id, professional_user_id, headline, skills[], profile_url, role_category, visible(bool), tokan_band |
| `connections` | end-user → professional connect requests | id, project_id?, end_user_id, professional_user_id, message, backend_workitem_id, status |
| `skills` | published skill-marketplace entries | id, author_user_id, manifest_ref, version, review_status, signature_ref, downloads |
| `feed_artifacts` | pre-signed feed objects (or pointers) | id, kind(masters\|runtime\|registry\|timestamp), version, sha256, signature_ref, url |
| `donations` | donations (anonymous-friendly) | id, user_id?, email?, amount_minor, currency, status, provider, provider_ref |
| `subscriptions` | professional subscriptions (gate the download) | id, user_id(unique), plan, status, provider, provider_ref, current_period_end |
| `tokan_task_submissions` | First Tokan Task peer-reviews of seed profiles | id, reviewer_id, seed_profile_id, answers(jsonb), created_at — awards via `activities`+`tokan_entries` |

> The **authoritative** workflow/UAM/Tokans state lives in the backend; the website tables are the
> public/edge projections (profiles, listings, registries, connection intents). Keep them thin.

---

## 4. Partner-ad / connection flow (consideration 2 & 3)

```
 Other suite app (sharedcorelib)            tokans/website                 tokans/backend         myWorkAssistant
   partner ad (from masters) ──click──▶ profile page on tokans.org
                                              │ end-user clicks "Connect"
                                              ▼
                                     POST /api/connections ──REST──▶ Workflow.NewTask
                                     (end-user registers now,                │ create WorkItem,
                                      minimal, privacy-first)                 │ assign Stage.role
                                                                              ▼
                                                                        professional inbox  ◀── streamed
                                                                        (executes, agent-assisted)
```

- The ad is sourced from the **partner master** (signed feed) the other app already pulls — no live
  call into the other app. The other app's end-user stays **anonymous until they choose to connect**.
- The partner master is **published by the website** from `partner_listings`; other apps consume it
  via the `sharedcorelib` masters/OTA pipeline (`common:` / app scopes, anti-rollback per namespace).

---

## 5. Phase mapping (Tokans strategy)

- **P1 (0–3m):** homepage, `/hire` `/join` `/founders`, First Tokan Task, manual verification, 3
  employer design partners. **Add `/professionals` + the `/apps` support directory (sharedCoreLib apps
  eligible; owner-initiated acceptance workflow is a later TODO) + partner directory + download gate**
  so the desktop cockpit has data to execute. **Add `/donate` + `/professionals/subscribe` on the
  payments seam (mock by default; Razorpay [India] / Stripe to go live) — an active subscription gates
  the download.**
- **P2 (3–6m):** ACIE v1 wiring (calls backend), employer subscriptions, **paid project marketplace**,
  skill marketplace publish, signed feeds for the suite updater.
- **P3 (6–12m):** backers flow, RQS/anti-gaming surfaces, case studies, Tokan Velocity, employer
  dashboard.
- **P4 (12m+):** scouts, enterprise surface, subdomains (`learn`/`audit`/`verify`), public Tokan API.

---

## 6. Security & privacy
- End-users browsing partner ads are **never asked to sign up and their info is not collected**;
  registration happens only at **connect** and is minimal.
- Ingest-don't-display: raw external metrics are never shown; only computed Tokan scores.
- Keep client secrets server-side (OAuth secrets, `BACKEND_REST_URL`/identity-token secret); CSRF +
  rate-limit on all POSTs.
- **Feed signing keys never enter CI/Vercel** — functions serve pre-signed artifacts only (TUF-style).
- Releases/builds publish to the **`tokans` GitHub account** (cross-account `PUBLISH_TOKEN`), incl. the
  myWorkAssistant installers and the **verified ZeroClaw sidecar artifact** the desktop app fetches.

---

## 7. Build order (commit per step)
1. Backend REST client (`server/lib/backend/`) + identity-forwarding token. 2. `/professionals` onboarding + download gate +
partner-master publish. 3. `projects` registry + `/apps` + `/founders`. 4. Partner directory (ads) +
public profile pages. 5. `connections` → backend `NewTask` bridge. 6. `/hire` `/join` + First Tokan
Task UI on existing tables. 7. Skill marketplace publish. 8. Signed feed endpoints for the suite
updater. 9. ACIE/employer-subscription/marketplace wiring (P2). 10. Phase 3/4 surfaces.

## 8. Considerations traceability
1 `/professionals` onboarding → §2.1. 2 partner master publish → §2.2,§4. 3 connect→NewTask→inbox →
§4. 4 onboarding/download gate + skill/feature catalogs → §2.1,§2.2. 8 front door + app registry →
§0,§3. 9 skill marketplace publish → §2.2,§3. (5,6,7 are backend/desktop concerns.)
