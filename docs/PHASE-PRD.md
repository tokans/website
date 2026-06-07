# tokans/website — Phase PRD

> Per-project view. Full cross-project matrix + DAG: [tokans/docs/PROGRAM-PHASES.md](../../docs/PROGRAM-PHASES.md).
> Build detail: [BUILD-PLAN.md](BUILD-PLAN.md). Legend: ⬢ deliverable · ⟸ blocked by · ⟹ blocks.

Baseline already built: React+Vite, Vercel functions, Neon, Redis sessions, email/GitHub/Google
auth + account linking, `onboarding/complete`, and the talent tables (`users`, `user_roles`,
`activities`, `tokan_entries`, `reviews`, `employer_briefs`, `matches`).

---

## P0 — Foundations
⬢ `api/lib/grpc.ts` typed gRPC client to BE + identity-forward (short-lived signed token). ⬢
`/professionals` onboarding skeleton (dynamic-form manifests shared with MWA) + **download-gate stub**.
- ⟸ **BE P0** proto/types (D1).
- **Exit:** website calls one BE RPC end-to-end.

## P1 — Registry + Partner ads + Connect→Task
⬢ `projects` table + `/apps` (register vibe-coded apps) + `/founders` (audit booking). ⬢ Partner
**directory/ads** + public profile pages (privacy-first; no end-user PII to view). ⬢ `POST
/api/connections` → **BE `Workflow.NewTask`** (end-user registers minimally at connect). ⬢ `/hire`
`/join` + **First Tokan Task** UI on existing tables. ⬢ `/professionals` complete + **download gate**
(role assigned by BE). ⬢ Partner-master publish (basic, signed).
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
