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

It is **not** the source of truth for workflow/UAM/Tokans — that is `tokans/backend` (gRPC). The
website is a **REST/SSR edge** that calls the backend.

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
│  • gRPC client ───────────────────────────────────────────────┼──▶ tokans/backend (gRPC)
│  • signed-feed publisher (masters / registry / runtime)       │     UAM · workflow · Tokans · ACIE
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
- **`/professionals` onboarding** — the professional signup that profiles profession & relevant
  questions (dynamic forms, shared manifests with the desktop app), then **gates the download** of
  myWorkAssistant and **registers them as a Partner** (writes to the partner master feed via backend).
- **`/founders`** — register/describe a **vibe-coded app**; book a codebase audit.
- **`/apps`** — end-user **app registry**: add app (repo URL, stack, description), see partner support
  options. *(New data model, §3.)*
- **`/hire`** (employer 7-Q brief) · **`/join`** (engineer onboarding + First Tokan Task) — wire the
  existing backend tables to UI.
- **Partner directory / ads** — public, privacy-preserving listings (link to tokans.org profiles); the
  same data that other suite apps pull as **Partner masters**. **No end-user PII collected to view.**
- **First Tokan Task** — 5-question anonymized peer-review UI (writes `reviews`).
- **Profile cards / Tokan breakdown** — ingest-don't-display (only Tokan scores; never raw metrics).

### 2.2 API additions (Vercel functions → gRPC backend)
- `POST /api/professionals/onboard` → backend UAM (assign Role/RoleCategory `Partner`) + download grant.
- `GET  /api/professionals/download` → signed download/enroll link for myWorkAssistant (gated).
- `POST /api/apps` / `GET /api/apps/:id` / `GET /api/apps` → vibe-coded app registry CRUD.
- `GET  /api/partners` → partner directory (ad listings; public, paginated, origin-safe profile links).
- `POST /api/connections` → **initiate a connection** (end-user → professional). Calls backend to
  **create a `workItem`** (NewTask) in the workflow → routed to the professional's inbox. End-user
  registers at this point (minimal account); no PII shared beyond what's needed for the task.
- `POST /api/skills` / `GET /api/skills` → **skill marketplace** listings (publish/list user-authored
  skills; backend runs the review workflow + signs distribution).
- `GET  /api/feed/*` → **signed feeds** for `sharedcorelib` suite updater: `masters` (incl. partner
  master + `common:app` registry), `runtime` bundle, `timestamp`/`snapshot` (TUF-style). Keys stay
  **offline**; the function serves pre-signed artifacts only.
- Reuse existing auth/session/CSRF; add gRPC client lib in `api/lib/grpc.ts`.

### 2.3 gRPC client (REST→gRPC bridge)
- `api/lib/grpc.ts` — typed client to `tokans/backend` (proto generated from hyperclaw schemas).
  Vercel functions translate REST ↔ gRPC; the browser never sees gRPC. Mirrors the comms-architecture
  remote tier. Auth: forward the session's identity as a short-lived signed token to the backend.

---

## 3. Data-model additions (Neon Postgres)

Append-only migrations. New tables (names indicative):

| Table | Purpose | Key fields |
|---|---|---|
| `projects` | the vibe-coded apps end-users register | id, owner_user_id, name, repo_url, stack, description, status, embeds_sharedcorelib(bool) |
| `partner_listings` | the ad listings served to other suite apps | id, professional_user_id, headline, skills[], profile_url, role_category, visible(bool), tokan_band |
| `connections` | end-user → professional connect requests | id, project_id?, end_user_id, professional_user_id, message, backend_workitem_id, status |
| `skills` | published skill-marketplace entries | id, author_user_id, manifest_ref, version, review_status, signature_ref, downloads |
| `feed_artifacts` | pre-signed feed objects (or pointers) | id, kind(masters\|runtime\|registry\|timestamp), version, sha256, signature_ref, url |

> The **authoritative** workflow/UAM/Tokans state lives in the backend; the website tables are the
> public/edge projections (profiles, listings, registries, connection intents). Keep them thin.

---

## 4. Partner-ad / connection flow (consideration 2 & 3)

```
 Other suite app (sharedcorelib)            tokans/website                 tokans/backend         myWorkAssistant
   partner ad (from masters) ──click──▶ profile page on tokans.org
                                              │ end-user clicks "Connect"
                                              ▼
                                     POST /api/connections ──gRPC──▶ Workflow.NewTask
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
  employer design partners. **Add `/professionals` + app registry + partner directory + download gate**
  so the desktop cockpit has data to execute.
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
- Keep client secrets server-side (OAuth secrets, gRPC creds); CSRF + rate-limit on all POSTs.
- **Feed signing keys never enter CI/Vercel** — functions serve pre-signed artifacts only (TUF-style).
- Releases/builds publish to the **`tokans` GitHub account** (cross-account `PUBLISH_TOKEN`), incl. the
  myWorkAssistant installers and the **verified ZeroClaw sidecar artifact** the desktop app fetches.

---

## 7. Build order (commit per step)
1. gRPC client lib + identity-forwarding token. 2. `/professionals` onboarding + download gate +
partner-master publish. 3. `projects` registry + `/apps` + `/founders`. 4. Partner directory (ads) +
public profile pages. 5. `connections` → backend `NewTask` bridge. 6. `/hire` `/join` + First Tokan
Task UI on existing tables. 7. Skill marketplace publish. 8. Signed feed endpoints for the suite
updater. 9. ACIE/employer-subscription/marketplace wiring (P2). 10. Phase 3/4 surfaces.

## 8. Considerations traceability
1 `/professionals` onboarding → §2.1. 2 partner master publish → §2.2,§4. 3 connect→NewTask→inbox →
§4. 4 onboarding/download gate + skill/feature catalogs → §2.1,§2.2. 8 front door + app registry →
§0,§3. 9 skill marketplace publish → §2.2,§3. (5,6,7 are backend/desktop concerns.)
