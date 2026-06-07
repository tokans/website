# tokans/website — Phase PRD

> Per-project view. Full cross-project matrix + DAG: [tokans/docs/PROGRAM-PHASES.md](../../docs/PROGRAM-PHASES.md).
> Build detail: [BUILD-PLAN.md](BUILD-PLAN.md). Legend: ⬢ deliverable · ⟸ blocked by · ⟹ blocks.

Baseline already built: React+Vite, Vercel functions, Neon, Redis sessions, email/GitHub/Google
auth + account linking, `onboarding/complete`, and the talent tables (`users`, `user_roles`,
`activities`, `tokan_entries`, `reviews`, `employer_briefs`, `matches`).

---

## P0 — Foundations
⬢ Backend **REST** client `api/lib/backend/` (`getBackend()` → mock | rest) + identity-forward
(short-lived signed token in the `Authorization` header). **Web tier is REST-only — no gRPC** (gRPC is
the desktop↔backend transport). ⬢ `/professionals` onboarding skeleton (dynamic-form manifests shared
with MWA) + **download-gate stub**.
- ⟸ **BE P0** REST API contract (D1).
- **Exit:** website calls one BE endpoint end-to-end (mock by default).

## P1 — Registry + Partner ads + Connect→Task
⬢ `apps` table + `/apps` (public directory of apps listed for Tokans support; sharedCoreLib apps
eligible; owner-initiated acceptance workflow → BE `Workflow.NewTask` is a later TODO) + `/founders`
(audit booking). ⬢ Partner
**directory/ads** + public profile pages (privacy-first; no end-user PII to view). ⬢ `POST
/api/connections` → **BE `Workflow.NewTask`** (end-user registers minimally at connect). ⬢ `/hire`
`/join` + **First Tokan Task** UI on existing tables. ⬢ `/professionals` signup/onboarding (role
assigned by BE). ⬢ **Payments seam** (`PaymentsPort`, mock default; Stripe Checkout to go live):
`/donate` (anonymous) + `/professionals/subscribe` — an **active subscription gates the
myWorkAssistant download**. Gateways: **Razorpay (India, primary)** / Stripe (global), mock by default.
⬢ Partner-master publish (basic, signed).
- ⟸ **BE P1** Workflow.NewTask (D5) + role assignment (D7).
- ⟹ Connect creates the inbox tasks MWA consumes (D6); download gate unblocks MWA install (D7);
  partner master feeds other suite apps' ads (D8).
- **Exit:** a connect action creates a routed BE WorkItem; download gate issues a gated installer.

## P2 — Skill marketplace + Signed feeds + Monetization
⬢ `POST/GET /api/skills` (publish/list, BE reviews+signs). ⬢ **Signed feed endpoints** for the
sharedcorelib suite updater (`masters` incl. partner + `common:app`, `runtime`, `timestamp/snapshot`;
serve **pre-signed** only). ⬢ Employer subscriptions + **paid project marketplace** UI. ⬢ ACIE
wiring (calls BE).
- ⟸ **BE P2** SkillsService + FeedService (D10, D11).
- ⟹ Suite feeds + skill listings consumed by MWA (D10) and other apps (D11); the **`tokans` release
  space** hosts MWA installers + the verified ZeroClaw artifact (D12).
- **Exit:** a published skill is listed; the suite updater consumes a signed feed.

## P3 — Proof surfaces
⬢ Case studies (Tokan↔delivery correlation) + employer dashboard (brief mgmt, match history,
delivery ratings) + Tokan Velocity / RQS surfaces.
- ⟸ **BE P3** ACIE retraining + outcome data (D13).

## P4 — Platform
⬢ `/scouts` (angel/scout) + enterprise surface + subdomains (`learn`/`audit`/`verify`) + public
Tokan API consumption.
- ⟸ stable BE contracts.

### Privacy invariants (all phases)
End-users browsing partner ads are never asked to sign up; registration occurs only at **connect**,
minimal. Ingest-don't-display (only Tokan scores). Feed/code signing keys stay **offline**.
