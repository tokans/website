# Tokans Onboarding Flow

This document is the authoritative specification for the onboarding system. Every branch,
choice, validation, and backend action is listed here. Modify this doc first; implement from it.

---

## Architecture Overview

There are **two onboarding engines**:

| Engine | File | Trigger |
|--------|------|---------|
| **Generic** | `src/screens/Onboarding.tsx` | Any login where no named journey applies (plain `/app`, `/login`, profile-change re-onboarding) |
| **Journey** | `src/screens/JourneyFlow.tsx` + `src/data/journeys.ts` | Specific entry paths (`/join`, `/hire`, `/founders`, `/onboard`) that pre-select the role and optionally pre-fill answers |

`App.tsx` decides which engine to show:
1. If `session.onboardingComplete === false` → show onboarding
2. If `reOnboarding === true` (user clicked "change profile" in Dashboard) → show Generic engine even if previously complete
3. Entry path (`?flow=xxx`) → look up in `JOURNEYS` map → if found use Journey engine, else Generic

Both engines call the **same backend endpoint**: `POST /api/onboarding/complete`.

---

## Shared reference: skillList

Used in multiple places. This exact list is the canonical `skillList`:

- Software Development Engineer (SDE)
- Engineering Manager (EM / SDM)
- Product Manager
- Designer (UI/UX)
- Data Scientist / ML Engineer
- DevOps / Platform / SRE
- QA / SDET
- Marketing Professional
- Business Analyst
- Other

---

## Engine A — Generic (Onboarding.tsx)

### Entry conditions
- No named journey for the entry path, OR no entry path
- Also used when `reOnboarding=true` (role change from dashboard)

### Step structure

```
Step 0:  Role picker                      (always shown)
Step 1:  Sub-type picker                  (only if role ∈ {opportunity_seeker, builder, employer})
Step 2:  Context questions                (always shown after role/subtype)
Step 3:  Barrier / what-happens-next      (only if role ∈ {opportunity_seeker, builder, employer})
```

Total steps by role:
- opportunity_seeker → 4 steps (role + subtype + context + barrier)
- builder → 4 steps (role + subtype + context + barrier)
- employer → 4 steps (role + subtype + context + barrier)
- mentor → 2 steps (role + context)
- donor → 0 steps — immediately calls API + redirects to /patrons on Continue
- angel → 2 steps (role + context)

---

### Step 0 — Role picker

**UI:** 6 role cards in a 3-column grid.

| Role ID | Label | Side |
|---------|-------|------|
| `opportunity_seeker` | Opportunity Seeker | Supply |
| `builder` | Builder | Mixed |
| `employer` | Employer | Demand |
| `mentor` | Mentor | Supply |
| `donor` | Mission Backer | Impact |
| `angel` | Angel / Scout | Demand |

**canAdvance:** role !== null

**Special case — donor:**
Clicking Continue with `donor` selected → call `POST /api/onboarding/complete` with `{ role: "donor" }` → on `{ ok: true }` response → redirect to `https://www.tokans.org/patrons`. No further onboarding steps shown.

> **Re-onboarding note:** When `reOnboarding=true`, hint text is shown: "Switching roles replaces your current profile. Your Tokan history is preserved."

---

### Step 1 — Sub-type picker (roles: opportunity_seeker, builder, employer)

#### opportunity_seeker

**UI:** chip grid (2 columns), items from skillList.

Selecting "Other" reveals a free-text input "Please specify your role" (stored as `subType`).
All other selections store the chip label as `subType`.

**canAdvance:** subType !== null (if "Other", `otherSubType` must also be non-empty)

#### builder

**UI:** radio cards (single column)

| Sub-type ID | Label | Description |
|-------------|-------|-------------|
| `idea_stage` | Idea / Early Stage | Building something new, looking for a co-founder or collaborator. Equity context, no budget yet. |
| `vibe_founder` | Product with Traction | V1 is shipped and users exist — I need trusted technical help to take it further. I have a budget. |
| `service_provider_company` | Established Service Provider | I can provide trusted technical help to founders for a negotiable fee. |

**When `service_provider_company` is selected:** show the skillList immediately below the radio cards as a **multi-select chip grid**. Label: "What services do you provide?" Stored as `context.subType2` (comma-separated string). This is part of Step 1 — not a separate step.

**canAdvance:** subType !== null (if `service_provider_company`, at least one skill chip must also be selected)

#### employer

**UI:** radio cards (single column)

| Sub-type ID | Label |
|-------------|-------|
| `startup_sme` | Startup / SME |
| `enterprise` | Enterprise (invite-only waitlist) |

Selecting `enterprise` shows an InfoBox: "Enterprise access is currently invite-only. We'll add you to the waitlist."

**canAdvance:** subType !== null

---

### Step 2 — Context questions

#### opportunity_seeker

Fields (both required):
- `displacement` — "What changed in your last role because of AI?" (textarea, max 400)
- `next` — "What are you looking for next?" (textarea, max 300)

**canAdvance:** displacement.trim() && next.trim()

#### builder / idea_stage

Fields:
- `buildDesc` — "Describe what you're building" (textarea, max 600) **required**
- `websiteUrl` — "Your website / landing page URL or GitHub repo / Pages URL" (url input) **required**
  - Full hint shown below input (not truncated): "For a website we'll email the contact address on the site to confirm you own it; for a GitHub repo or Pages URL we verify ownership via GitHub sign-in."
  - Placeholder shows all three accepted formats on separate lines: `https://yourproject.com`, `https://github.com/you/app`, `https://you.github.io/app`

**canAdvance:** buildDesc.trim() && websiteUrl.trim()

#### builder / vibe_founder

Fields:
- `bottleneck` — "What skills do you need to progress forward?" (multi-select chip grid from skillList) **required** (at least one)
- `problem` — "Describe your most pressing problem that needs a solution." (textarea, max 500) **required**
- `websiteUrl` — "Your website / landing page URL or GitHub repo / Pages URL" (url input) **required**
  - Same hint and placeholder format as idea_stage above

**canAdvance:** at least one bottleneck selected && problem.trim() && websiteUrl.trim()

#### builder / service_provider_company

Fields:
- `description` — "Describe the services your company provides" (textarea, max 500) **optional**
- `websiteUrl` — "Your company website URL" (url input) **required**
  - Hint: "We'll use your website to verify your company and list your services in the directory."

**canAdvance:** websiteUrl.trim()

#### employer

4 textarea fields, all required (max 400 each):
- `q1` — "What does this person need to own — not just do?"
- `q2` — "What does success look like in 60 days?"
- `q3` — "What's your current biggest technical bottleneck?"
- `q4` — "Have you tried to hire for this before? What happened?" (hint: "You'll complete questions 5–7 after account setup — tech setup, engagement type, and budget.")

**canAdvance:** q1 && q2 && q3 && q4 all non-empty

#### mentor

Shows eligibility info and a dropdown:
- `existingUser`: "yes" | "no" | "nominated"
  - "no" → InfoBox: "You'll start as an Opportunity Seeker and earn Tokans through real contributions. Once you reach the 500 Tokan threshold, the Mentor role unlocks automatically."

**canAdvance:** existingUser non-empty

#### angel

- `investorUrl` — "LinkedIn or AngelList profile URL" (url input) **required**
- `investmentFocus` — "What are you typically looking to back?" (textarea, max 400) **required**

**canAdvance:** investorUrl.trim() && investmentFocus.trim()

---

### Step 3 — Barrier / what-happens-next (roles: opportunity_seeker, builder, employer)

Info-only steps; no inputs. **canAdvance:** always true.

#### opportunity_seeker — "Earn your first Tokan in under 10 minutes"
Describes the First Tokan Task peer review (5 structured questions, ~8 minutes).

#### builder / idea_stage — "We'll confirm you own your site"
Explains: scrape contact email → send verification link → click to publish profile.

#### builder / vibe_founder — "We will match your ask with available partners"
Explains: 48-hour review of your submission → matched with a professional or service company from the directory based on your skill needs → outcome-based engagement.

#### builder / service_provider_company — "Your services will be listed in the directory"
Explains: we verify your website → list your company and services in the Tokans directory → builders can find and engage you directly.

#### employer — "No browse. No filter. A curated shortlist."
Explains: 24-hour brief review → shortlist of up to 5 profiles → mutual interest unlock → rejection feedback loop.

---

### Final step submit → `POST /api/onboarding/complete`

Payload:
```json
{
  "role": "...",
  "subType": "...",
  "context": {
    "subType2": "SDE,QA / SDET",   // service_provider_company only — comma-separated skills
    "websiteUrl": "...",            // builders only
    ...other fields
  },
  "entryPath": null
}
```

Frontend branches on response:

```
result.autoVerified === true
  → setAutoVerified(true), setDone(true)
  → Done screen: "Profile verified via GitHub ✓"

result.needsGithubAuth === true
  → show NeedsGithubAuthStep
  → NOT done yet

result.verificationSent === true && result.scrapedEmail
  → setVerifyEmailSent(scrapedEmail), setDone(true)
  → Done screen: "Sent to {email} — click the link to publish your profile."

result.verificationSent === false && result.emailDomain
  → show WebsiteEmailStep (enter email @{domain})
  → NOT done yet

result.redirect === "/patrons"
  → window.location.href = "https://www.tokans.org/patrons"
  → (donor only)

(none of the above)
  → setDone(true)
  → Done screen (non-builder roles, or builders with no websiteUrl)
```

---

### Done screen

**Title:**
- `reOnboarding=true` → "Profile updated, {firstName}"
- else → "You're in, {firstName}"

**"What happens next" items:** role+subtype-specific. Builders override based on verification outcome.

**SiteSetupInstructions block** (builders only, when `context.websiteUrl` is set):
- GitHub repo URL → steps to enable GitHub Pages
- GitHub Pages URL → confirm Pages is enabled
- Custom domain → CNAME/DNS steps + GoDaddy forwarding warning

**Post-onboarding email notice** (all roles):
- If we have an email (from scraping or OAuth login): "We'll get back to you at {email}."
- If no email on record: show an email input field to collect it (optional, with "Add email" CTA).

**Button:** "Go to my dashboard →" → calls `onComplete(...)` → returns user to Dashboard

---

## Engine B — Journey (JourneyFlow.tsx)

### Entry conditions

Entry path matches a named journey key.

| Entry path | Role | Sub-type | Notes |
|------------|------|----------|-------|
| `/join` | opportunity_seeker | chosen in step | |
| `/hire` | employer | chosen in step | |
| `/founders` | builder | chosen in step | role fixed, sub-type picked by user |
| `/onboard` | any | any | role+sub-type+fields may be pre-filled from template |

---

### Journey: JOIN (/join → opportunity_seeker)

Steps:
1. **choice** — skillList chips → stored as `subType`
2. **fields** — `displacement` (required, max 400) + `next` (required, max 300)
3. **barrier** — First Tokan Task explanation

Finish label: "Start my First Tokan Task →"

Done screen items: First Tokan Task → profile goes live → earn Tokans.

---

### Journey: HIRE (/hire → employer)

Steps:
1. **choice** — startup_sme / enterprise (enterprise shows waitlist InfoBox)
2. **fields** — q1–q4 (all required, max 400, ~10 min InfoBox)
3. **barrier** — curated shortlist explanation

Finish label: "Complete setup →"

Done screen items: brief review in 24h → shortlist → complete q5–q7 in dashboard.

Backend: after `api.completeOnboarding`, also calls `api.saveEmployerBrief({ q1, q2, q3, q4 })`.

---

### Journey: FOUNDERS (/founders → builder)

Role is fixed to `builder`. Sub-type is chosen by the user — same picker and same step content as the Generic builder flow (idea_stage / vibe_founder / service_provider_company).

Steps (same content as Generic engine builder steps):
1. **Sub-type picker** — idea_stage / vibe_founder / service_provider_company (+ subType2 multi-select if service_provider_company)
2. **Context** — per sub-type, same fields as Generic Step 2 builder
3. **Barrier** — per sub-type, same content as Generic Step 3 builder

Done screen items: per sub-type, same as Generic engine.

Entry path `"founders"` is recorded in `user_journeys`.

Website verification triggers for all builder sub-types (same logic as Generic — any builder with websiteUrl).

---

### Journey: ONBOARD (/onboard?ref=&val=)

A template-driven journey. Two query params:

| Param | Type | Purpose |
|-------|------|---------|
| `val` | hash string | Identifies the template — maps to a row in `onboarding_templates` table |
| `ref` | free-text label | Identifies the referrer or distribution channel (e.g. "startup-india-2026-booth"). Optionally links to an existing user's ID hash. Stored on the resulting signup. |

**Behaviour:**
1. On load, fetch template by `val` hash from `GET /api/onboarding/template?val=...`
2. Template contains: role, subType, and pre-filled values for any context fields
3. Role and subType from the template are set automatically — those picker steps are **skipped**
4. Context steps with **all required fields pre-filled** are also skipped
5. Context steps with **partially pre-filled fields** are shown with fields pre-populated (editable)
6. User completes remaining steps normally
7. On submit: `POST /api/onboarding/complete` includes `{ ref, templateId }` in payload for attribution tracking

**If `val` is missing or invalid:** fall back to Generic engine with no pre-fill.

---

## Admin UI (new — `/admin/*` routes, admin session required)

### Template management

**`/admin/templates`** — list all templates with name, role, sub-type, creation date, QR code download.

**`/admin/templates/new`** — create a template:
1. Pick role → pick sub-type → fill in any/all context fields (same UI as the user-facing onboarding, but all fields optional)
2. Give the template a name (internal label)
3. On save → generates `val` hash → stored in `onboarding_templates` table
4. Shows the generated URL: `https://tokans.org/onboard?val={hash}` and a QR code for that URL
5. `ref` is left blank in the template — the admin copies the URL and can append `&ref=my-label` per distribution channel

**`/admin/templates/{id}`** — edit or delete a template. Regenerating the hash invalidates old QR codes — show a warning.

**`onboarding_templates` table:**
```sql
CREATE TABLE onboarding_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  val_hash    TEXT UNIQUE NOT NULL,   -- the ?val= param value
  role        TEXT NOT NULL,
  sub_type    TEXT,
  context     JSONB NOT NULL DEFAULT '{}',  -- pre-filled field values
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`onboarding_signups` table** (attribution tracking):
```sql
CREATE TABLE onboarding_signups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  template_id  UUID REFERENCES onboarding_templates(id),
  ref          TEXT,          -- free-text referrer label
  ref_user_id  UUID REFERENCES users(id),  -- set if ref maps to a known user
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Backend: POST /api/onboarding/complete

### DB writes (always, for all roles)

1. `INSERT INTO onboarding_data (user_id, role, sub_type, sub_type2, context) ... ON CONFLICT DO UPDATE`
   - `sub_type2`: stored from `context.subType2`, extracted before persisting
2. `INSERT INTO user_roles (user_id, role, sub_type, sub_type2) ... ON CONFLICT DO UPDATE`
3. If `entryPath` set: `INSERT INTO user_journeys ... ON CONFLICT DO UPDATE`
4. If `ref` + `templateId` in payload: `INSERT INTO onboarding_signups (...)`
5. Read back `user_journeys` for `completedJourneys[]`
6. Rotate Redis session (`onboardingComplete=true`, new role/subType)

### Donor shortcut

`role === "donor"` → write to DB (steps 1–5 above) → return `{ ok: true, redirect: "/patrons" }`. No website verification.

### Website verification (all builders)

Triggered when: `role === "builder" && context.websiteUrl.trim() !== ""`

Applies to all builder sub-types: `idea_stage`, `vibe_founder`, `service_provider_company`.

```
websiteUrl provided?
  NO  → return { ok: true }

  YES → is GitHub URL (github.com/owner/repo)?

    YES
      storedGithubLogin === ghCoords.owner?
        YES → UPDATE users SET is_verified=true, website_url=websiteUrl
              upsertAppForBuilder (fire-and-forget)
              return { ok: true, autoVerified: true }

        NO  → scrapeReadmeEmail(owner, repo)
              found?
                YES → store ws_verify token (24h)
                      await sendEmail(verification)
                      upsertAppForBuilder
                      return { ok: true, verificationSent: true, scrapedEmail }

                NO  → storedGithubLogin exists (wrong owner)?
                        YES → return { ok: true, verificationSent: false, emailDomain: "github.com" }
                        NO  → return { ok: true, verificationSent: false, needsGithubAuth: true }

    NO (regular URL)
      scrapeContactEmail(websiteUrl) → { email, domain, githubCoords }

      email found?
        YES → store ws_verify token
              await sendEmail(verification)
              upsertAppForBuilder
              return { ok: true, verificationSent: true, scrapedEmail: email }

        NO  → site links to GitHub repo?
                YES → storedGithubLogin === linkedGh.owner?
                        YES → UPDATE is_verified; upsertAppForBuilder
                              return { ok: true, autoVerified: true }
                        NO  → scrapeReadmeEmail(linkedGh)
                              found?
                                YES → send token + email; upsertAppForBuilder
                                      return { ok: true, verificationSent: true, scrapedEmail }
                                NO  → storedGithubLogin exists?
                                        YES → return { verificationSent: false, emailDomain: domain }
                                        NO  → return { verificationSent: false, needsGithubAuth: true }

                NO  → upsertAppForBuilder
                       return { ok: true, verificationSent: false, emailDomain: domain }
```

### Re-onboarding + websiteUrl

- Same URL as already verified → prefill previous context, overwrite `onboarding_data` on submit, skip re-verification
- Different URL → run full verification flow
- Existing unverified app row for this URL → overwrite the row, resend verification email (old token still accepted if it arrives before the new one is clicked)

### upsertAppForBuilder

For `service_provider_company`: creates a row in the `professionals`/`partners` table tagged as `company` (not `individual`), rather than in the `apps` table. The `sub_type2` skills become the listed services.

For `idea_stage` and `vibe_founder`: unchanged — creates/updates a row in the `apps` table.

```
idea_stage or vibe_founder:
  URL under trusted prefix (github.com/tokans/ or tokans.github.io/)?
    YES → INSERT INTO apps (listed=TRUE, support_status='listed') ON CONFLICT DO UPDATE
    NO  → INSERT INTO apps (listed=FALSE, support_status='requested')
           → Redis approval token (7d TTL)
           → await sendEmail to APP_APPROVAL_EMAIL with approve link

service_provider_company:
  → INSERT INTO partners (user_id, role_category='Partner', sub_type='company', skills=subType2, website_url=websiteUrl, description=description)
    ON CONFLICT (user_id) DO UPDATE
  → listed immediately (no approval needed — website verification is the gate)
```

---

## Frontend post-verification states

### WebsiteEmailStep

Scraper found domain but no email. User enters their `@{domain}` email manually.
Calls `POST /api/onboarding/send-verify` → backend validates domain match, stores token, sends email.
On success → done screen.

### NeedsGithubAuthStep

GitHub URL detected but user has no GitHub OAuth connected.
Shows project URL + "Connect GitHub" button → GitHub OAuth → re-submit → auto-verifies or sends README email.

### Email verification link (GET /api/auth/verify-website?token=...)

- Read `ws_verify:{token}` from Redis as `VerifyPayload` (do NOT JSON.parse — Upstash auto-deserializes)
- `UPDATE users SET website_url=..., is_verified=true WHERE id={userId}`
- Delete Redis token
- Redirect to `/app?verified=website`

---

## Dashboard features

### Change Profile

Role pill in nav bar (`{ROLE} ✎`) → sets `reOnboarding=true` → Generic engine re-runs.
Done screen: "Profile updated, {firstName}". On complete → `setReOnboarding(false)` → back to dashboard.

### Employer questions 5–7

Dashboard section for employers (shown until completed):
- `q5` — "What is your current technical setup?" (textarea)
- `q6` — "What type of engagement are you looking for?" (textarea)
- `q7` — "What is your budget range?" (textarea)

Saves to `employer_briefs` table via `POST /api/employer/brief` (extend existing endpoint to accept q5–q7).

---

## DB schema additions required

```sql
-- onboarding_data: add sub_type2
ALTER TABLE onboarding_data ADD COLUMN IF NOT EXISTS sub_type2 TEXT;

-- user_roles: add sub_type2
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS sub_type2 TEXT;

-- onboarding_templates (new)
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  val_hash    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL,
  sub_type    TEXT,
  context     JSONB NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- onboarding_signups (new, attribution)
CREATE TABLE IF NOT EXISTS onboarding_signups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  template_id  UUID REFERENCES onboarding_templates(id),
  ref          TEXT,
  ref_user_id  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Implementation order (suggested)

### Phase 1 — Core onboarding changes (self-contained, no new tables except sub_type2)
1. `roles.ts` — add `service_provider_company` to BUILDER_SUBTYPES
2. `OnboardingSteps.tsx` — update builder Step 1 (service_provider_company + subType2 chips), Step 2 (vibe_founder new fields, service_provider_company fields), Step 3 (new barrier content)
3. `Onboarding.tsx` — canAdvance updates; donor shortcut; subType2 state; websiteUrl input hint fix
4. Schema migration: add `sub_type2` columns
5. `complete.ts` — sub_type2 in DB writes; broaden verification guard to all builders; donor redirect
6. `journeys.ts` — FOUNDERS: remove fixedSubType, use generic builder steps

### Phase 2 — Service provider listing
7. `partners` table: add `sub_type` tag `company` support + `website_url` + `skills` + `description` columns if missing
8. `upsertAppForBuilder` — route `service_provider_company` to partners table

### Phase 3 — Dashboard additions
9. Post-onboarding "get back to you" email notice + email input if missing
10. Employer q5–q7 section in dashboard

### Phase 4 — Admin UI + /onboard template journey
11. Schema: `onboarding_templates` + `onboarding_signups`
12. Admin pages: template list, create, edit
13. `/onboard` route + template fetch + pre-fill logic in JourneyFlow

---

## One remaining question

**Q12 — FOUNDERS done screen:** with sub-type now chosen by the user (not fixed), should the FOUNDERS done screen use the **same per-sub-type done items as the Generic engine**, or does `/founders` always show the same fixed items regardless of which sub-type was chosen?

My assumption (pending your answer): use the Generic engine's per-sub-type done items — the FOUNDERS journey is now just the Generic builder flow with a recorded entry path.
