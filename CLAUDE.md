# claude.md — Tokans.org
> Drop this file at the start of any new session. It is the single source of truth for all Tokans work.
> Last synced: May 2026 · Covers: strategy, design system, copy, architecture, SEO/GEO, open tasks.

---

## 0. Quick orientation

**What is this project?** The corporate website and eventual product platform for [tokans.org](https://tokans.org) — a pay-it-forward, contribution-based professional ecosystem for people navigating the AI era.

**Current phase:** Pre-launch. Landing page (index.html) is live/built. Login and signup are separate projects marked "Coming Soon." No backend exists yet.

**Primary contact:** Founder/CTO, India. Networks: IIT alum, ISB alum, ex-colleagues, CTO/founder peer group.

**Do not ask the founder to re-explain the product.** Everything needed is in this file.

---

## 1. The one-liner (never change without explicit approval)

> "AI needs Tokens. Humans need Tokans."

**Secondary positioning lines (approved, use contextually):**
- "LinkedIn shows what you say you've done. Tokans shows what you've actually proven recently."
- "AI is making hiring more consequential and less reliable at the same time. We fix the second half of that."
- "Not bought. Not transferred. Not gamified."
- "High Tokans should correlate with better real-world performance."

**Retired lines (do not use):**
- "AI runs on tokens. Humanity runs on Tokans." — retired May 2026

---

## 2. Product definition

**Tokans** = verifiable tokens of human contribution, earned through learning, building, mentoring, and real work.

The platform sits at the intersection of three problems:
1. Professionals displaced by AI have no structured path to rebuild and prove value
2. Employers cannot trust resumes or interviews — AI-generated content has destroyed signal quality
3. Vibe-coded founders (built with AI tools, now need real engineers) have no reliable way to find and evaluate technical help

**Core thesis:** High Tokans should correlate with better real-world performance. Everything — the scoring engine, verification system, peer reviews, employer matching — exists to make that correlation real and provable.

---

## 3. Domain architecture

| Domain | Purpose | Status |
|---|---|---|
| `tokans.org` | Philosophy, identity, Tokan engine, community | Active — landing page built |
| `experthires.tokans.com` | Employer-facing hiring product | Future |
| `newbeginnings.tokans.org` | Onboarding for displaced professionals | Do not build yet |
| `learn.tokans.org` | Reskilling | Do not build yet |
| `audit.tokans.org` | AI QA marketplace | Do not build yet |
| `verify.tokans.org` | Trust layer | Do not build yet |

**Rule:** One surface until Month 3. Do not build multiple subdomains simultaneously.

---

## 4. Design system

### Aesthetic direction
Dark editorial. Warm, not cold. Think: a financial newspaper that was born in the AI era. Not a startup. Not a Web3 project. Not a job board.

### Color tokens
```css
--bg:           #0A0908;       /* near-black, warm undertone */
--bg-card:      #111009;       /* card backgrounds */
--bg-lift:      #161410;       /* hover states, nested panels */
--border:       rgba(255,255,255,0.07);
--border-warm:  rgba(242,185,90,0.18);  /* amber-tinted borders for featured elements */
--cream:        #F0EBE0;       /* primary text */
--cream-dim:    #A8A198;       /* secondary text, labels */
--amber:        #F2B95A;       /* primary accent — Tokan brand color */
--amber-hot:    #F5A020;       /* hover state for amber */
--amber-glow:   rgba(242,185,90,0.12); /* background tints */
--sage:         #7EA89A;       /* verification / success / positive signals */
--sage-dim:     rgba(126,168,154,0.2);
--red-flag:     #E05C4B;       /* warnings, gaming flags */
```

### Typography
```css
--font-display: 'Playfair Display', Georgia, serif;  /* headings, hero, quotes */
--font-ui:      'Syne', sans-serif;                  /* body, UI, nav */
--font-mono:    'DM Mono', 'Courier New', monospace; /* data, scores, labels, eyebrows */
```

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap
```

### UI patterns
- **Eyebrows:** `font-mono`, `0.72rem`, `letter-spacing: 0.16em`, `uppercase`, amber, preceded by a 28px amber line via `::before`
- **Section headings:** Playfair Display, `font-weight: 900` for hero, `700` for sections
- **Data / scores / labels / percentages:** Always DM Mono
- **Cards:** `bg-card` background, `border-warm` border for featured, `border` for standard, `border-radius: 12px`
- **Buttons:** `border-radius: 6px`, amber primary (`color: #0A0908`), outline secondary
- **Grain overlay:** Applied via `body::before` SVG data URI, `opacity: 0.6`, `pointer-events: none`, `z-index: 9999`
- **Scroll-reveal:** `.reveal` class + IntersectionObserver, `opacity: 0 → 1`, `translateY(28px → 0)`, stagger via `.reveal-delay-1/2/3/4`

### Tokan type color coding (used in bars, badges, icons)
| Type | Color |
|---|---|
| Build | Amber gradient (`#F2B95A → #F5A020`) |
| Work | Sage (`#7EA89A → #5B9988`) |
| Mentor | Soft purple (`#B4A4D4 → #9580C0`) |
| Knowledge | Low-contrast white (`rgba(255,255,255,0.35)`) |
| Impact | Warm red (`#E07060`) |
| Legacy/Handoff | Blue-grey (`#9BAEBC`) |

### Verification weight color coding
| Weight | Color var |
|---|---|
| 0.3× self-reported | `cream-dim` |
| 0.7× peer (1–2) | `sage` |
| 1.0× peer (3+) | `sage` |
| 1.3× platform verified | `amber` |
| 1.6× employer verified | `amber-hot` |

---

## 5. The Tokan scoring system

### Formula
```
Tokans = Base Value × Verification Weight × Impact Multiplier × Confidence Factor
```

### Verification weights
| Source | Weight |
|---|---|
| Self-reported | 0.3× |
| Peer-reviewed (1–2) | 0.7× |
| Peer-reviewed (3+) | 1.0× |
| Platform-verified | 1.3× |
| Employer-verified | 1.6× |

### Impact multipliers
`0.8×` (low) → `1.0×` (medium) → `1.5×` (high) → `2.0×` (exceptional)

### Confidence factor
`0.6` (1 review) → `0.9` (2–3 reviews) → `1.2` (4+ consistent). Plateaus at 7 reviews.

### Score decay
| Age | Retained value |
|---|---|
| 0–3 months | 100% |
| 3–6 months | 80% |
| 6–12 months | 60% |
| 12+ months | 40% |

### Category caps
- Max 40% from Knowledge Tokans
- Max 30% from Mentor Tokans
- Must have 20%+ Build or Work Tokans for "hireable" status

### Tokan Velocity
Tokans earned in last 90 days. Key signal of active contribution. Always display alongside total score.

### Hiring thresholds
| Score | Tier |
|---|---|
| < 200 | Early stage |
| 200–500 | Emerging talent |
| 500–1,000 | Proven contributor |
| 1,000+ | Expert |

### Anti-gaming rules
- Diminishing returns on repeated actions: first 10 reviews = full value, next 20 = 50%, beyond = 20%
- Reviewer Quality Score (RQS): reviewers gain/lose weight based on outcome alignment
- Mutual review detection: flagged and Tokans nullified
- Gaming = account disabled + marked publicly (not just a score penalty)

---

## 6. Tokan types

| Type | Earned by |
|---|---|
| **Knowledge** | Verified courses, assessments, technical explanations |
| **Build** | GitHub contributions (merged/reviewed/meaningful), shipped projects |
| **Work** | Freelance tasks, project milestones, employer-verified work |
| **Mentor** | Validated mentoring sessions with confirmed mentee progress |
| **Impact** | Referrals, community contributions, high-quality peer reviews |
| **Legacy/Handoff** | Taking over codebases, writing docs for others' code, code audits, refactoring — distinct from greenfield building |

---

## 7. Roles

### Role 1: Opportunity Seeker
Supply side. Core user. Keep onboarding frictionless.

**Sub-types:** SDE, Engineering Manager, Product Manager, Designer (UI/UX), Data Scientist / ML Engineer, DevOps / Platform / SRE, QA / SDET, Marketing Professional, Business Analyst, Other (free text)

**Entry barrier:** Complete onboarding context capture + First Tokan Task (~8 min peer review). No further barrier.

**Features:** Full Tokan profile, job/project matching, peer review queue, skill assessments, all Tokan types.

---

### Role 2: Builder

**Sub-type A — Idea / Early Stage:** Co-founder seeker. Supply side. Earn Impact Tokans.
- Entry: Describe build (~100 words) + website ownership verification (email from site domain)
- Features: Co-founder brief (equity/idea only), mutual-interest matching, Builder feed

**Sub-type B — Product with Traction (Vibe-coded Founder):** Has v1, has users, has budget. Demand side. Acute pain.
- Budget typically: ₹80,000–1,50,000 for 4–6 week engagement
- Entry: Codebase description (stack, pain, what's built)
- Flow: Codebase assessment → one-page handoff brief → match with Legacy/Handoff Tokan earner
- This is the best early revenue segment. Short sales cycle (days, not months).

---

### Role 3: Mentor
- Entry: 500 Tokans with 20%+ Build/Work, OR 2 peer nominations
- Features: Async/live mentoring sessions, mentee matching, Mentor Tokan earning, "Mentor" badge, mentor directory listing
- Status earned, not self-declared

---

### Role 4: Donor / Mission Backer
- Entry: Identity verification + ₹5,000 minimum donation
- Features: Sponsor specific users, anonymised impact reports, "Founding Backer" badge, private backer community channel

---

### Role 5: Angel Investor / Scout
- Entry: Verified investor identity (LinkedIn, AngelList, or network reference) + brief describing investment focus
- Features: Read-only Builder profiles, express interest (routed to builder, no direct contact), Scout Briefs, quarterly digest
- Cannot see Opportunity Seeker profiles

---

### Role 6: Employer
**Sub-types:** Startup/SME (active), Enterprise (future only — do not build)
- Entry: Complete 7-question employer brief before accessing any profiles
- Features: Match queue (max 5 profiles), brief management, max 3 simultaneous expressions of interest, structured rejection ("Not a fit — tell us why")

**The 7 employer brief questions:**
1. What does this person need to own, not just do?
2. What does success look like in 60 days?
3. What's your current biggest technical bottleneck?
4. Have you tried to hire for this before? What happened?
5. What does your current technical setup look like?
6. Is this a project, a part-time role, or a full hire?
7. What's your budget range?

---

## 8. Employer match card UI spec

The match card is a canonical UI pattern. Always render it like this:

```
[Name hidden until mutual interest]          Match: 87%  ← Why this match →

Build:   ████████░░   High confidence
Work:    ██████░░░░   Employer verified
Mentor:  ███░░░░░░░   Peer reviewed

// Top verified contribution
"Led migration of monolith to microservices
 for a 50k DAU product. Reviewed by 3 peers
 + 1 platform engineer."

Availability:   Part-time / open to project
Location:       Bangalore (remote-first)
Tokan velocity: +340 in last 90 days  ↑ Active

[Express interest]    [Not a fit — tell us why]
```

**Key rules:**
- Name always hidden until mutual interest
- Max 5 profiles shown per brief
- Max 3 simultaneous expressions of interest
- Every rejection is structured (never a dismiss button)

---

## 9. Pricing

### Track A — Startup Hiring
| Tier | What | Price |
|---|---|---|
| Brief + 3 matches | One brief, 3 curated profiles, intro facilitated | ₹15,000 one-time |
| Project placement | Full engagement | 12% of project value |
| Monthly talent access | Unlimited briefs, up to 3 active roles | ₹25,000/month |

Start with one-time brief. Move to monthly subscription after 3 successful matches with the same employer.

### Track B — Vibe-Coded Founders
- 15% of engagement value, paid on delivery
- No upfront cost — zero friction
- Typical: ₹80,000–1,50,000 engagement → Tokans earns ₹12,000–22,500

---

## 10. SEO / GEO configuration

### Metadata (canonical)
```html
<title>Tokans — Verifiable Tokens of Human Contribution in the AI Era</title>
<meta name="description" content="Tokans.org is a contribution-based professional ecosystem where engineers, product managers, and builders earn verifiable proof of real work — not resumes. AI needs tokens. Humans need Tokans." />
<link rel="canonical" href="https://tokans.org/" />
<meta property="og:locale" content="en_IN" />
```

### JSON-LD schemas in use
1. `Organization` — name, url, logo, description, foundingDate, areaServed: IN
2. `WebSite` + `SearchAction`
3. `FAQPage` — the four canonical FAQs (see Section 11)

### GEO optimization rules
- FAQ section must use `<details>/<summary>` HTML with full paragraph answers (not bullet points)
- FAQPage JSON-LD must mirror the visible FAQ content exactly
- Use semantic `<h1>` only once per page (hero heading)
- All section headings `<h2>`, card headings `<h3>`
- Every `<section>` has `aria-labelledby` pointing to its heading
- Score card and match card: `role="img"` with `aria-label` description
- Social proof / mission quote: `<blockquote>` element

### Target keywords (primary)
- tokans, tokans.org
- human contribution AI era
- verified professional skills
- contribution based hiring
- AI displaced professionals India
- peer reviewed work history
- professional reputation platform
- vibe coded founder technical help

---

## 11. Canonical FAQ content

These four questions and answers are the GEO-optimized source of truth. Use them verbatim in FAQ sections and JSON-LD.

**Q: What exactly is a Tokan?**
A Tokan is a verifiable unit of professional contribution. Unlike points you earn on a gamified platform, Tokans are weighted by how they were verified — ranging from 0.3× for self-reported to 1.6× for employer-verified. They decay over time (100% in 0–3 months, down to 40% after 12 months), so your score always reflects what you've recently proven — not just your career highlight reel.

**Q: How is this different from LinkedIn or GitHub?**
LinkedIn shows what you say you've done. GitHub shows code you've pushed. Tokans shows what you've actually proven recently — with peer verification, employer verification, and anti-gaming systems built in. We also specifically track Legacy/Handoff skills (taking over codebases, documentation, refactoring) which no other platform surfaces as a distinct category.

**Q: Can you buy or transfer Tokans?**
No. Tokans are not a cryptocurrency, a loyalty point, or a transferable asset. They are earned through contribution and attached to you. Attempting to game the system results in account disablement marked publicly. The value of Tokans depends entirely on the integrity of the system.

**Q: When is Tokans launching?**
We're in the founding-member phase. We're locking employer design partners, recruiting founding reviewers, and preparing onboarding for our first cohort. Join the waitlist to be among the first to earn Tokans and shape how the platform works.

---

## 12. Copy and voice rules

### Tone
- Direct. Confident. Not hype. Not startup-speak.
- Founder voice: CTO credibility, not a marketer.
- Specific numbers over vague claims. ("0.3× for self-reported" not "low trust")
- Never use: "revolutionary," "disruptive," "game-changing," "next-gen," "AI-powered" (ironic given the context)

### Formatting rules
- Eyebrows always start with `//` (monospace code convention, not decorative)
- Data, scores, percentages, weights, thresholds → DM Mono, never body font
- Verified / positive signals → sage color
- Warnings, decay, gaming flags → `red-flag` color
- Primary Tokan brand color → amber (never purple, never blue)

### Things that must always be true in copy
- Tokans are never described as points, tokens (crypto sense), coins, or currency
- The word "verified" must always be paired with *who* verified it (peer / platform / employer)
- "Coming soon" is the only acceptable framing for login/signup — never "in beta," "join now," "sign up"
- Pricing always in INR (₹) — this is an India-first product

---

## 13. What "Coming Soon" means

Login (`/login`) and Signup (`/signup`, `/onboarding`) are **separate projects**. They do not exist yet.

On the current landing page, all login/signup CTAs:
- Trigger a modal overlay (not a redirect)
- Are visually marked with a `Coming soon` badge
- Use `.btn-disabled` class (no pointer events)
- The modal copy is context-aware: login modal ≠ signup modal

**Do not build login or signup flows in the same project as the landing page without explicit instruction.**

---

## 14. Page structure (current: index.html)

```
nav                    — Fixed, scrolled state via .scrolled class
#hero                  — H1, score card (animated), CTAs
.marquee-wrapper       — Scrolling Tokan type labels
#problem               — Three-column problem grid
#how-it-works          — Six Tokan types + scoring formula + thresholds
#roles                 — Six role cards
#for-employers         — Employer pitch + match card mockup
#vs                    — Tokans vs LinkedIn comparison
#mission               — Core thesis blockquote
#faq                   — Expandable FAQ (GEO-optimized)
#cta                   — Waitlist CTA
footer                 — Links + brand tagline
.cs-overlay            — Coming soon modal (shared, context-aware)
```

### Animations in use
- Hero elements: CSS `@keyframes fadeUp` with staggered delays (no JS)
- Score card counter: JS `requestAnimationFrame` count-up to 620
- Score bars: CSS `transition: width 1.4s` triggered by IntersectionObserver
- Section reveals: `.reveal` class + IntersectionObserver → `.visible`
- Marquee: CSS `@keyframes marquee`, pauses on hover

---

## 15. GTM context (for content, ads, outreach copy)

### Phase 1 — Supply (Month 1–2)
Engineers and developers affected by AI displacement.
Channels: LinkedIn, IIT/ISB alum networks, Reddit, StackOverflow, X layoff discussions.

### Phase 2 — Demand (Month 1–2, parallel)
3 employer design partners from personal network. Vibe-coded founders via IndieHackers, X, Peerlist, Product Hunt.

### Phase 3 — Proof (Month 3–4)
50–100 successful placements. 5 case studies. Match quality data.

### Phase 4 — Scale (Month 5+)
Expand categories, monthly employer subscriptions, recruiter partnerships.

### CTO network pitch (for outreach copy)
> "You're cutting the easy-to-measure roles. The one hire you need to get right in the next 6 months is the hardest to evaluate through a normal process. That's exactly what we exist for."

### Vibe-coded founder pitch (for outreach copy)
> "Before we match you with anyone, tell us about what you've built."

---

## 16. Open tasks (as of May 2026)

- [ ] Login page — separate project, link: `/login` → "coming soon" until built
- [ ] Signup / onboarding — separate project, link: `/signup` → "coming soon" until built
- [ ] `experthires.tokans.com` — employer subdomain, future
- [ ] OG image (`/og-image.png`) — needs to be created (1200×630px, dark editorial style)
- [ ] Favicon / logo assets — `logo.png` referenced in JSON-LD, not yet created
- [ ] Email capture for waitlist — needs backend or third-party form (Tally, Typeform, Loops.so etc.)
- [ ] Analytics — no tracking installed yet
- [ ] Seed profile library — 20–30 manually created profiles for first-task reviews
- [ ] First 3 employer design partners — to be locked before user onboarding begins
- [ ] First 10–15 founding reviewers — from founder's personal network

---

## 17. Technical notes

- **Stack:** Pure HTML/CSS/JS for landing page. No framework, no build step.
- **Fonts:** Google Fonts (Playfair Display, Syne, DM Mono) — loaded via `<link>` in `<head>`
- **No external JS libraries** on landing page (intentional — performance)
- **No backend / no database** — landing page is fully static
- **File:** `index.html` — single file, self-contained
- When generating new HTML pages, maintain the same CSS variable names and class naming conventions
- All monetary values in INR (₹), never USD unless explicitly asked
- Target audience is India-first; `og:locale` is `en_IN`

---

## 18. What not to do

- Do not suggest adding multiple subdomains until Month 3
- Do not describe Tokans as a blockchain, cryptocurrency, or NFT project — they are not
- Do not use purple gradients on white backgrounds (generic AI aesthetic)
- Do not use Inter, Roboto, or Arial as fonts
- Do not build login/signup into the landing page project
- Do not suggest a "dashboard" before 10 successful manual employer matches
- Do not recommend open filtering/search of the talent pool for employers (max 5 curated profiles per brief)
- Do not frame the employer product as a job board
- Do not use the word "gamified" positively — it is explicitly what Tokans is not
