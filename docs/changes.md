I need to update the Tokans.org website with significant positioning and content changes. The site is built with the existing stack — do not change the tech stack or visual design system. Only change content, copy, structure, and the "who it's for" section roles.

## Context
Tokans is being repositioned from a narrow "vibe-coded founders finding engineers" hiring platform to a privacy-native app ecosystem where domain experts build, distribute, and deliver services — and users own their data.

The tagline "AI needs Tokens. Humans need Tokans." must be preserved exactly as is throughout.

First explore the project structure and identify where page content and copy are stored, then make the following changes.

---

## Change 1: Headline and primary positioning

Current primary headline:
"You built using AI Tokens. Scale it with Human Tokans."

Replace with:
"AI builds with Tokens. Humans build with Tokans."

Current secondary/sub line (the description under the headline):
Replace with:
"A privacy-native ecosystem where domain experts build, distribute, and deliver — and users own their data."

---

## Change 2: Replace the "Who it's for" section

Remove all existing role cards entirely:
- Builder (vibe-coded founder)
- Contributor (Engineer/PM/Designer)
- Mentor
- Employer
- Mission Backer
- Angel/Scout

Replace with exactly four role cards in this order:

**User**
Icon: 🏠
Label: User
Subtitle: Privacy-first apps, your data on your device
Body: Free to start. Apps that run locally on your device — finance, health, memories, documents. No cloud. No telemetry. Your data never leaves your machine.
CTA: Explore Apps → (anchor link to the Live Apps section on this page)

**Builder**
Icon: ⚡
Label: Builder
Subtitle: Domain expert who built with AI
Body: You built something with AI that solves a real problem in your field. Tokans gives you distribution, trust verification, and a ready audience you could never reach alone. A great app in isolation stays an island.
CTA: List your app → (link to /founders which is the existing onboarding flow, now repurposed for all domain expert builders not just technical founders)

**Partner**
Icon: 🤝
Label: Partner
Subtitle: Professional delivering human services
Body: Lawyer, doctor, financial advisor, accountant — you have expertise that users need but cannot self-serve. Tokans routes verified service requests to you. Enter at zero cost, pay only as you consume platform services.
CTA: Become a partner → (link to /partners — create as a placeholder page with a brief description and email capture if it does not already exist)

**Contributor**
Icon: 🛠️
Label: Contributor
Subtitle: Technical professional building the ecosystem
Body: Build and maintain privacy-native apps within the Tokans ecosystem. Earn verified reputation through real contribution — peer reviewed, employer verified, time-decaying. Proof of work that cannot be faked.
CTA: Join as contributor → (link to existing /join flow)

---

## Change 3: Add a Privacy Manifesto section

Insert this as a new section between the hero/headline section and the Live Apps section.

Section title: "Why privacy-native?"

Content — four statements displayed as a 2x2 grid of simple cards:

**Features are commoditised.**
GenAI has collapsed the cost of building apps to near zero. The value of software is no longer its feature set.

**Compliance is not enough.**
GDPR and DPDP set a regulatory floor — but your data still sits on someone else's server, protected only by their promises. That is delegation of risk, not ownership.

**The economics of attacks have broken.**
AI has made cyberattacks trivially cheap. Any centralised vault holding millions of records is always worth the attack. The prize exceeds the cost of the key.

**Architecture is the only answer.**
When your data lives only on your own device, there is no central target worth attacking. Privacy not as a policy — as a structural guarantee.

Closing line below the grid, italic and centred:
"Not because a company promises to behave — but because there is no central target worth attacking."

---

## Change 4: Add a Live Apps section with horizontal carousel

Insert a new section after the Privacy Manifesto section and before the "Who it's for" section.

Section title: "Live today"

Implement as a horizontally scrollable carousel. Each app is a card of consistent size. The carousel should be easy to extend — new cards are added by duplicating the card component and filling in the details. On mobile the carousel scrolls horizontally with swipe. On desktop it shows as many cards as fit with left/right scroll arrows or drag to scroll.

Cards in order:

**Card 1 — myFinance**
Icon or badge: 💰
Name: myFinance
Tagline: Your money, on your machine.
Description: Personal finance app — budgets, investments, ITR JSON import, encrypted vault, LAN sync. Runs entirely on your device.
CTA button: Download free →
Link: https://tokans.github.io/myFinance/
Status badge: Live

**Card 2 — myHealth**
Icon or badge: 🏥
Name: myHealth
Tagline: Your health records, yours alone.
Description: Track health metrics, medications, appointments and medical history. Fully local. No health data ever leaves your device.
CTA button: Coming soon
Status badge: Coming Soon
CTA is non-clickable / greyed out

**Last Card — always pinned at the end of the carousel**
Icon or badge: ➕
Name: List your app here
Tagline: Built something for your domain?
Description: Submit your app through our onboarding and approval process. Verified apps get distribution, trust signals, and a ready audience of privacy-conscious users.
CTA button: Start onboarding →
Link: /founders
Style: Visually distinct from app cards — dashed border or lighter background to signal it is an invitation not a live listing

Below the carousel add two lines:
"All ecosystem apps are built on our open sharedCoreLib — giving you encrypted local storage, LAN sync, and device-native architecture out of the box. Building on sharedCoreLib also fast-tracks your listing approval."
With a link: "View sharedCoreLib on GitHub →" — leave this link as a placeholder pointing to # for now, to be updated when the repo is made public.

---

## Change 5: Navigation and page visibility

Main navigation should show exactly three links:
- /founders (label: "List your app" or "Builders")
- /partners (label: "Partners")
- /join (label: "Contributors")

Hide from main navigation but keep fully active and functional — accessible by direct URL, do not modify or delete:
- /patrons — called directly by apps, must remain live and fully intact
- /angels — kept for direct invite links, remove from navigation only
- /hire — hide from navigation, keep in codebase

Do not modify the /founders onboarding flow itself in this change. Only update where it is linked from and how the Builder role card describes it. The /founders page copy can be updated in a separate pass.

---

## Change 6: Footer and persistent tagline

Ensure this tagline appears in the footer on every page, exactly as written:
"AI needs Tokens. Humans need Tokans."

If it is already there, keep it exactly as is. If not, add it.

Update the meta description to reflect the new positioning:
"Tokans is a privacy-native app ecosystem where domain experts build, distribute, and deliver — and users own their data. AI needs Tokens. Humans need Tokans."

---

## Do not change:
- The visual design system, colour palette, or typography
- The Tokan scoring concept and how it is explained
- The overall site structure and navigation shell
- The /founders onboarding flow content and functionality
- The /patrons page content and functionality
- The /join flow content and functionality

---

After making all changes, run the site locally and confirm:
1. The new headline renders correctly on mobile and desktop
2. The Privacy Manifesto 2x2 grid is readable and well spaced
3. The Live Apps section shows myFinance with the correct download link
4. Exactly four role cards appear in the "who it's for" section in the correct order
5. /founders, /partners, /join appear in main navigation
6. /patrons loads correctly at its direct URL and has not been modified
7. /angels, /hire are not in navigation but accessible by direct URL
8. The tagline appears in the footer on every page