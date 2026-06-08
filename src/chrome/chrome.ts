/**
 * Shared site chrome — the SINGLE source of truth for the header and footer.
 *
 * Rendered as framework-agnostic HTML strings so the exact same markup powers:
 *   • static HTML shells   → injected by src/chrome/mount.ts into [data-chrome]
 *   • React island pages   → wrapped by SiteHeader / SiteFooter in components/site.tsx
 *
 * Styling uses the shared Tailwind tokens/classes defined in src/tailwind.css,
 * so chrome looks identical to the marketing landing on every page.
 */

export interface HeaderOptions {
  /** Where the "← back" link points (default: home). */
  backHref?: string;
  /** Label for the back link (default: "Home"). */
  backLabel?: string;
  /** Hide the back link entirely (e.g. on the landing page). */
  hideBack?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  cta?: boolean;
  hideSm?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/apps", label: "Apps", hideSm: true },
  { href: "/partners", label: "Partners" },
  { href: "/hire", label: "Hire", hideSm: true },
  { href: "/join", label: "Join", hideSm: true },
  { href: "/donate", label: "Donate" },
  { href: "/?flow=login", label: "Sign in", cta: true },
];

export const SITEMAP: {
  heading: string;
  links: { href: string; label: string; ext?: boolean }[];
}[] = [
  {
    heading: "Platform",
    links: [
      { href: "/", label: "Home" },
      { href: "/#what-is-tokans", label: "What are Tokans?" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/apps", label: "Apps directory" },
    ],
  },
  {
    heading: "For you",
    links: [
      { href: "/join", label: "Engineers — Join" },
      { href: "/hire", label: "Employers — Hire" },
      { href: "/founders", label: "Founders — List an app" },
      { href: "/professionals", label: "Professionals" },
    ],
  },
  {
    heading: "Network",
    links: [
      { href: "/partners", label: "Partner directory" },
      { href: "/tokan-task", label: "First Tokan Task" },
      { href: "/donate", label: "Donate" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { href: "https://x.com/TokansOrg", label: "X / Twitter", ext: true },
      { href: "https://www.linkedin.com/company/tokans", label: "LinkedIn", ext: true },
      { href: "mailto:hello@tokans.org", label: "hello@tokans.org" },
    ],
  },
];

const wordmark = (size: number, cls = "") =>
  `<span class="wordmark ${cls}" style="font-size:${size}px">Tok<span class="wordmark-ans">ans</span></span>`;

/** Header markup. Returns an HTML string. */
export function headerHTML(opts: HeaderOptions = {}): string {
  const { backHref = "/", backLabel = "Home", hideBack = false } = opts;

  const back = hideBack
    ? ""
    : `<a href="${backHref}" class="text-[13px] text-ink-muted hover:text-ink whitespace-nowrap transition-colors">← ${backLabel}</a>`;

  const links = NAV_LINKS.map((l) => {
    if (l.cta) {
      return `<a href="${l.href}" class="btn btn-primary !py-2 !px-4 !rounded-full text-[13px]">${l.label}</a>`;
    }
    const hide = l.hideSm ? "hidden sm:inline" : "";
    return `<a href="${l.href}" class="${hide} text-[14px] text-ink-muted hover:text-ink transition-colors">${l.label}</a>`;
  }).join("");

  return `
<header class="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-10 py-3 border-b border-border" style="background:rgba(254,254,254,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
  <div class="flex items-center gap-[18px]">
    <a href="/" aria-label="Tokans home" class="inline-flex">${wordmark(22)}</a>
    ${back}
  </div>
  <nav class="flex items-center gap-[14px] sm:gap-6" aria-label="Site">
    ${links}
  </nav>
</header>`.trim();
}

/** Footer markup with sitemap. Dark navy, matching the marketing landing. */
export function footerHTML(): string {
  const cols = SITEMAP.map(
    (col) => `
    <div>
      <h4 class="text-[12px] tracking-[0.1em] uppercase text-white/40 mb-[14px]">${col.heading}</h4>
      <ul class="grid gap-[10px] list-none p-0 m-0">
        ${col.links
          .map(
            (l) =>
              `<li><a href="${l.href}"${
                l.ext ? ' target="_blank" rel="noopener noreferrer"' : ""
              } class="text-[14px] text-white/65 hover:text-sky transition-colors">${l.label}</a></li>`,
          )
          .join("")}
      </ul>
    </div>`,
  ).join("");

  return `
<footer class="mt-auto bg-ink text-white px-4 sm:px-10 pt-12 sm:pt-16 pb-8">
  <div class="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 sm:gap-12 max-w-[1100px] mx-auto">
    <div class="col-span-2 sm:col-span-1">
      <a href="/" aria-label="Tokans home" class="inline-flex mb-[18px]">${wordmark(24, "text-white")}</a>
      <p class="text-[14px] text-white/50 leading-relaxed max-w-[30ch]">A pay-it-forward ecosystem for professionals navigating the AI era.</p>
      <p class="mt-4 font-serif italic text-[17px] text-white/60 leading-snug">AI needs Tokens.<br/>Humans need Tokans.</p>
    </div>
    ${cols}
  </div>
  <div class="max-w-[1100px] mx-auto mt-12 pt-6 border-t border-white/10 flex flex-wrap justify-between gap-3 text-[12px] text-white/40">
    <span>© 2026 Tokans.org · Not bought. Not transferred. Not gamified.</span>
    <span>AI needs Tokens. Humans need Tokans.™</span>
  </div>
</footer>`.trim();
}
