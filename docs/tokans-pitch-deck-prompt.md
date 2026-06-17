# Tokans — 7-Slide Pitch Deck Generation Prompt

> Edited to match the **tokans.org website** color scheme (light · sky-blue + amber,
> from `src/tailwind.css :root`) and to reuse the project's own images where possible
> (`public/images/*.png`, `public/app-icons/*.png`). Edit freely below, then paste the
> whole file as a prompt to generate the deck.

---

Generate a 7-slide PowerPoint pitch deck using pptxgenjs and sharp.
Save the output to `/mnt/user-data/outputs/Tokans_Pitch_7Slide.pptx`

After generating, convert to PDF and render slide images for visual QA using:
```
python /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to pdf /mnt/user-data/outputs/Tokans_Pitch_7Slide.pptx
pdftoppm -jpeg -r 150 Tokans_Pitch_7Slide.pdf slide
```
Then show me all slide images.

---

## PROJECT IMAGES — copy these into the working dir before running

These are real assets from the Tokans website repo (`public/`). Use them where the
config references a file path; only fall back to a generated SVG/PNG when no real
image fits (the attack/mesh/flywheel diagrams).

```
ASSETS = {
  // Brand mark — teal brain on deep navy (slide 1 decoration + footer chip)
  logo:        "public/images/logo.png",

  // Photography (warm, candid, on-brand)
  coding:      "public/images/coding.png",      // hands typing on laptop + sketch notebook → "building is trivial"
  dev:         "public/images/dev.png",          // solo dev at large monitor (alt for slide 2)
  founder:     "public/images/founder.png",      // founder writing at desk → slide 7 founder card
  shakehands:  "public/images/shakehands.png",   // two people shaking hands → partners/trust (slide 6 alt)
  architect:   "public/images/architect.png",    // whiteboard architecture session (alt)
  mentor:      "public/images/mentor.png",        // founder smiling at laptop, warm (alt)
  phone:       "public/images/phone.png",         // app running on a phone → slide 5 alt
  office:      "public/images/profile.png",       // soft blurred office bokeh (background texture)

  // Real app icons for the ecosystem grid (slide 5) — embed these instead of emoji
  appIcons: {
    myFinance:        "public/app-icons/myfinance.png",
    myHealth:         "public/app-icons/myhealth.png",
    myMemories:       "public/app-icons/mymemories.png",
    myWorkAssistant:  "public/app-icons/myworkassistant.png",
  }
}
```

---

## CONFIGURATION — edit this section to change content and visuals

```js
FOUNDER = {
  name: "Anshuman Das",
  credentials: [
    "IIT Delhi  ·  ISB Hyderabad",
    "20 years in financial technology",
    "CTO / CIO — MNC banks & retail brokerages",
    "300+ person technology teams",
    "HFT · trading platforms · risk systems at scale",
    "7 working apps built in one month",
    "Privacy-critical systems for millions of users",
  ],
  photo: ASSETS.founder,                 // public/images/founder.png
  tagline_close: "This is not a pivot. It is the most natural next step."
}

BRAND = {
  name: "TOKANS",
  logo: ASSETS.logo,                     // public/images/logo.png
  tagline: "AI needs Tokens.  Humans need Tokans.",
  sub: "A privacy-native ecosystem where verified human expertise meets AI-built software.",
  url: "https://www.tokans.org",
  url_label: "tokans.org"
}

// ── COLOUR PALETTE — sourced verbatim from the website tokens (src/tailwind.css :root)
//    LIGHT theme: white/sky-tinted surfaces, deep-navy ink text, sky-blue + amber accents.
//    (Replaces the original dark navy/teal deck palette.)
COLOUR_PALETTE = {
  // Surfaces (dominant backgrounds, was navy)
  bg:         "FEFEFE",   // page background — near-white
  bgAlt:      "F0F7FF",   // card background — soft sky tint
  bgSubtle:   "F8FAFC",   // subtle card variant
  white:      "FFFFFF",

  // Text / ink (deep navy, NOT pure black)
  ink:        "0C1929",   // primary text + dark panels/diagram strokes
  inkMuted:   "4A6080",   // secondary / muted body text
  inkFaint:   "8AAAC8",   // faint captions

  // Brand accents (primary = sky, was teal)
  sky:        "0EA5E9",   // primary accent — section labels, links, LIVE badges
  skyDark:    "0369A1",   // secondary accent — hovers, deep callouts
  skyLight:   "E0F2FE",   // soft accent fill / tinted chips
  amber:      "F59E0B",   // emphasis / footer callouts (was gold)
  amberLight: "FEF3C7",   // soft amber fill

  // Status
  verified:   "059669",   // solution / "good" indicators (was green)
  verifiedBg: "ECFDF5",
  warning:    "DC2626",   // problem / attack indicators (was red)

  // Lines
  border:     "E2E8F0",   // hairline borders / card outlines
}

// SLIDE 2 — THE SHIFT
SLIDE2 = {
  section: "01  /  THE SHIFT",
  headline: "Building apps is no longer a barrier.",
  stat_number: "7",
  stat_label: "working apps",
  stat_sub: "built in one month · solo · alongside a CTO role",
  // "Education" → ../../myEducation project (c:\workspace\myLife\myEducation)
  app_categories: "Finance · Health · Memories · Docs · Work · Hobbies · Education",
  body: [
    { text: "GenAI has collapsed the cost of app creation to near zero.\n\n" },
    { text: "A solo founder built 7 working apps in one month ", bold: false },
    { text: "alongside a full-time CTO role.\n\n", italic: true, color: "skyDark" },
    { text: "Finance. Health. Memories. Documents. Workflows. Education.\n\n", color: "inkMuted" },
    { text: "If building is trivial — who still pays for software, and why?", italic: true, color: "amber" },
  ],
  // Use the real "building" photo as the panel image; fold the big "7" into the text
  // panel as an amber stat callout. (Set image_source to "STAT_SVG" to use the
  // generated number graphic instead.)
  image_source: ASSETS.coding,   // public/images/coding.png  (alt: ASSETS.dev)
  image_side: "LEFT"             // LEFT or RIGHT — controls which side the visual appears
}

// SLIDE 3 — THE PROBLEM
SLIDE3 = {
  section: "02  /  THE PROBLEM",
  headline: "The economics of data security are broken.",
  problems: [
    {
      title: "Compliance is not enough",
      body: "GDPR and DPDP set a regulatory floor — but your data still sits on someone else's server. That is delegation of risk, not ownership."
    },
    {
      title: "AI killed the cost of attacks",
      body: "Cyberattacks are now trivially cheap and fast. The limiting factor is simple economics."
    },
    {
      title: "Centralisation is the vulnerability",
      body: "Any vault holding millions of records is always worth attacking. The prize exceeds the cost of the key. Every time."
    },
  ],
  footer: "Prize value > Cost of attack. The economics are broken.",
  // DIAGRAM CONFIG — central vault attack visual (generated SVG; no real photo fits)
  diagram: {
    vault_label: "CENTRAL VAULT",
    vault_sub: "Millions of records",
    attack_labels: ["AI-assisted attack", "cheap", "fast", "inevitable"],
    prize_label: "Prize value > Cost of attack",
    top_label: "GDPR & DPDP set a floor. Breaches still happen.",
  },
  image_source: "ATTACK_SVG",
  image_side: "RIGHT"
}

// SLIDE 4 — THE SOLUTION
SLIDE4 = {
  section: "03  /  THE SOLUTION",
  headline: "Privacy as architecture, not policy.",
  solutions: [
    {
      title: "Eliminate the central vault",
      body: "When data lives only on the user's own device, there is no central target worth attacking."
    },
    {
      title: "Each device is its own vault",
      body: "Distributed personal storage means the prize value of any single breach drops below the cost of the attack."
    },
    {
      title: "Architecture is the guarantee",
      body: "Not because a company promises to behave — but because the structure makes data theft unviable."
    },
  ],
  footer: "Privacy not as a policy. Privacy as a structural guarantee.",
  // DIAGRAM CONFIG — distributed mesh visual (generated SVG; no real photo fits)
  diagram: {
    node_count: 7,
    node_label: "encrypted",
    centre_label: "No central target.",
    centre_sub: "Each device is its own encrypted vault.",
    prize_label: "Prize value < Cost of attack ✓",
    node_emojis: ["💻","📱","🖥","📱","💻","🖥","📱"],
  },
  image_source: "MESH_SVG",
  image_side: "LEFT"
}

// SLIDE 5 — THE ECOSYSTEM
SLIDE5 = {
  section: "04  /  THE ECOSYSTEM",
  headline: "Curated apps. Seeded by us. Grown by verified partners.",
  points: [
    {
      icon: "🌱",
      title: "We seeded the ecosystem",
      body: "Finance, health, memories, documents, hobbies — useful apps covering the personal life stack."
    },
    {
      icon: "⚡",
      title: "Partners grow it",
      body: "Verified vibe coders and domain experts submit their own apps. We curate and approve every listing."
    },
    {
      icon: "🛠",
      title: "Built on sharedCoreLib",
      body: "Our open library gives builders encrypted local storage, LAN sync, and device-native architecture out of the box — and fast-tracks approval."
    },
    {
      icon: "🔒",
      title: "Users own their data",
      body: "Every app in the ecosystem runs locally. No telemetry. No cloud dependency. Free to start."
    },
  ],
  footer: "A great app built in isolation stays an island. Tokans connects it to the mainland.",
  // APP GRID CONFIG — embed the REAL app-icon PNGs where available (icon_img),
  // fall back to an emoji only where no icon file exists.
  apps: [
    { name: "myFinance",   icon_img: ASSETS.appIcons.myFinance,       status: "LIVE",   color: "sky"      },
    { name: "myHealth",    icon_img: ASSETS.appIcons.myHealth,        status: "SOON",   color: "verified" },
    { name: "myMemories",  icon_img: ASSETS.appIcons.myMemories,      status: "SOON",   color: "amber"    },
    { name: "myWork",      icon_img: ASSETS.appIcons.myWorkAssistant, status: "SOON",   color: "skyDark"  },
    { name: "myDocs",      icon: "📄",                                status: "SOON",   color: "inkMuted" },
    { name: "+ Your App",  icon: "➕",                                status: "SUBMIT", color: "sky", dashed: true },
  ],
  grid_cols: 3,
  grid_footer: "Built on sharedCoreLib · fast-track listing approval",
  grid_header: "Seeded by us · Grown by verified partners · Curated for trust",
  // alt full-bleed photo for the panel instead of the grid: ASSETS.phone
  image_source: "APP_GRID_SVG",
  image_side: "RIGHT"
}

// SLIDE 6 — PLATFORM & BUSINESS
SLIDE6 = {
  section: "05  /  PLATFORM & BUSINESS",
  headline: "Netflix for apps — but the content is your own life.",
  tiers: [
    {
      label: "FREE",
      title: "Local Apps",
      color: "inkMuted",
      items: [
        "Full suite of privacy-first apps",
        "Data stays on your device",
        "No subscription required",
        "Become a partner — inside every app"
      ]
    },
    {
      label: "SUBSCRIBER",
      title: "AI + Human Layer",
      color: "sky",
      items: [
        "myLifeAssistant — personal AI + human services",
        "myWorkAssistant — distributed workflow",
        "Optional encrypted sync & backup",
        "Access to verified partner network"
      ]
    }
  ],
  footer: "Partners enter at zero cost · pay only as they consume services",
  // FLYWHEEL DIAGRAM CONFIG (generated SVG). Alt: drop in ASSETS.shakehands (partners/trust photo).
  flywheel: {
    title: "The Ecosystem Flywheel",
    centre: { label: "Tokans", sub: "trust layer" },
    nodes: [
      { label: "Users",    icon: "👤", color: "ink",      position: "top" },
      { label: "Builders", icon: "⚡", color: "sky",      position: "right" },
      { label: "Partners", icon: "🤝", color: "amber",    position: "bottom" },
      { label: "Apps",     icon: "📱", color: "verified", position: "left" },
    ],
    footer: "Every transaction builds trust. Trust compounds."
  },
  image_source: "FLYWHEEL_SVG",   // or ASSETS.shakehands
  image_side: "LEFT"
}

// SLIDE 7 — WHY US
SLIDE7 = {
  section: "06  /  WHY US",
  headline: "The thesis is proven.\nThe product is live.",
  proof_points: [
    { label: "myFinance",     note: "Live · tokans.github.io/myFinance",         url: "https://tokans.github.io/myFinance/" },
    { label: "Tokans.org",    note: "Platform onboarding live",                   url: "https://www.tokans.org" },
    { label: "Kahaniverse",   note: "Social storytelling · Tokans-powered",       url: "https://www.kahaniverse.com" },
    { label: "myLife suite",  note: "7 seeded apps · open source · Tauri",        url: null },
    { label: "sharedCoreLib", note: "Encrypted local DB · LAN sync · device-native", url: null },
  ],
  founder_photo: ASSETS.founder,   // public/images/founder.png
  closing_tagline: "AI needs Tokens.\nHumans need Tokans.",
  footer: "This is not a pivot. It is the most natural next step."
}
```

---

## LAYOUT RULES — do not change these

- Slide 1: full-bleed **light** title (background `bg` / `bgAlt` subtle gradient), the
  `BRAND.logo` (`public/images/logo.png`) shown top-left or centred, decorative
  **sky** (`sky` / `skyLight`) circles top-right and bottom-left, amber underline accent
  on the emphasised tagline word.
- Slides 2–6: split layout, 46% image panel | 48% text panel, alternating sides per `image_side` field.
- Slide 7: split layout, left = founder card (photo `public/images/founder.png` + credentials), right = proof points + closing tagline box.
- Image panels: ROUNDED_RECTANGLE background (`bgAlt`) with a **soft light shadow**; if
  `image_source` is a file path, the photo fills the panel; if it ends in `_SVG`, render
  the corresponding generated diagram below and rasterize it to fill the panel.
- Generated visuals (stat graphic, attack diagram, mesh diagram, app grid, flywheel) are
  built as SVG then rasterized to PNG via sharp — do NOT use external image URLs. Real
  project photos/icons (the `ASSETS.*` paths) ARE used directly — embed those files.
- Fonts (match the website): **Syne** for headlines (32–26pt bold) with Georgia fallback;
  **Playfair Display** *italic* for the big title + closing taglines with Georgia fallback;
  **DM Sans** for body (13–10pt) with Calibri/Helvetica fallback; **DM Mono** for section
  labels with Consolas fallback. If a font is unavailable on the render machine it will
  fall back gracefully — keep the fallbacks in the font list.
- Shadow factory: `{ type:"outer", color:"0C1929", blur:10, offset:3, angle:45, opacity:0.12 }`
  — soft light-theme shadow; always create a fresh object per use, never reuse the same
  object across addShape calls.
- Never use `#` prefix on hex colours.
- Section labels: 10pt DM Mono, **sky**, charSpacing:3, bold, top-left of text panel,
  with a short leading rule (matches the site's `.eyebrow`).
- Footer callouts: 10–11pt DM Sans, **amber**, italic, bottom of slide.
- Body text colour is **ink** (`0C1929`) on light surfaces — never white-on-dark.
- Speaker notes: add delivery guidance to every slide via `addNotes()`.

## SVG ILLUSTRATION SPECS (recoloured for the light theme)

> All diagrams now sit on a light card (`bgAlt` = `#F0F7FF`) with **ink** (`#0C1929`)
> strokes/text, **sky** (`#0EA5E9`) primary accents, **amber** (`#F59E0B`) emphasis,
> **verified** green for "good", **warning** red for attacks. No dark fills.

Slide 2 stat graphic (520×400) — only if `image_source` is set to `"STAT_SVG"`:
- Light card background (`bgAlt`), rounded, hairline `border` outline.
- STAT_NUMBER in large serif (~220pt, Playfair/Georgia), **sky**, centred.
- Horizontal rule (`border`) then `stat_label` bold ink, `stat_sub` muted (`inkMuted`) below.
- Row of 7 small rounded squares at top (filled `skyLight`, `sky` outline) representing the apps, with `app_categories` text above in `inkMuted`.

Slide 3 attack diagram (520×400):
- Light card (`bgAlt`). Central vault rectangle: white fill, **warning** (red) border.
- `vault_label` (ink, bold) and `vault_sub` (inkMuted) inside.
- 4 dashed **warning**-red arrows attacking from top/left/right/bottom.
- Attack direction labels (cheap / fast / inevitable / AI-assisted attack) in warning red.
- `prize_label` in an **amber** chip (amberLight fill, amber text) below the vault.
- `top_label` in `inkMuted` at the very top.

Slide 4 mesh diagram (520×400):
- Light card (`bgAlt`). 7 circles in a loose cluster with NO central hub.
- Each circle: white fill, **sky** border, node_emoji inside, `node_label` (inkMuted) below.
- Thin **sky** lines connecting nodes to each other (mesh, not hub-and-spoke).
- Centred text box mid-diagram: `centre_label` bold **sky**, `centre_sub` `inkMuted`.
- `prize_label` in a **verified**-green chip (verifiedBg fill, verified text) at the bottom.

Slide 5 app grid (460×380):
- Light card (`bgAlt`). `grid_header` text at top in `inkMuted`.
- Apps rendered as `grid_cols` × N grid of white cards (hairline `border`, soft shadow).
- **Embed the real `icon_img` PNG** (`public/app-icons/*.png`) centred in each card where
  provided; otherwise render the emoji `icon`.
- LIVE status: **sky** border, sky status badge with white text.
- SOON status: border in the app's `color`, light status badge with ink text.
- SUBMIT/dashed status: dashed **sky** border, `skyLight` background, sky submit badge.
- `grid_footer` in `skyDark` at the bottom.

Slide 6 flywheel (520×400):
- Light card (`bgAlt`). Central circle: white fill, **sky** border, `centre.label` serif
  bold **sky**, `centre.sub` `inkMuted`.
- 4 outer circles at top/right/bottom/left; each white fill, border in its node `color`, icon + label (ink).
- Thin directional **sky** arrows between nodes suggesting circular flow.
- `title` at top (ink), `footer` at bottom (`inkMuted`).

## OUTPUT

Write the complete working Node.js script, install any missing npm packages, run it,
convert to PDF, render all slide images, and present the `.pptx` file for download.
Embed the real project images (`ASSETS.*`) directly; generate and rasterize only the
diagrams whose `image_source` ends in `_SVG`.
