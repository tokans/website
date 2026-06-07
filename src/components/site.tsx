import type { ReactNode } from "react";
import { Wordmark } from "./ui.js";

/** Shared header/footer/context chrome for every standalone page.
 *  Modelled on the marketing homepage (index.html) so the app feels like one
 *  site: logo links home, a back link sits next to it, a top nav bar carries a
 *  few links, and a footer carries the full sitemap. */

interface PanelContent {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  points?: string[];
}

// ── Top header bar ──────────────────────────────────────────────────────────
const NAV_LINKS: { href: string; label: string; cta?: boolean; hideSm?: boolean }[] = [
  { href: "/apps", label: "Apps", hideSm: true },
  { href: "/partners", label: "Partners" },
  { href: "/hire", label: "Hire", hideSm: true },
  { href: "/join", label: "Join", hideSm: true },
  { href: "/donate", label: "Donate" },
  { href: "/?flow=login", label: "Sign in", cta: true },
];

export function SiteHeader({
  backHref = "/",
  backLabel = "Home",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="site-header">
      <div className="site-header-left">
        {/* Logo links home */}
        <a href="/" className="site-header-logo" aria-label="Tokans home">
          <Wordmark size={22} />
        </a>
        {/* Back link sits right next to the logo */}
        <a href={backHref} className="site-header-back">← {backLabel}</a>
      </div>
      <nav className="site-nav" aria-label="Site">
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={[
              l.cta ? "site-nav-cta" : "",
              l.hideSm ? "site-nav-hide" : "",
            ].join(" ").trim()}
          >
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

// ── Footer with sitemap (templated from the homepage) ───────────────────────
const SITEMAP: { heading: string; links: { href: string; label: string; ext?: boolean }[] }[] = [
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

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <a href="/" className="site-footer-logo" aria-label="Tokans home">
            <Wordmark size={24} />
          </a>
          <p className="site-footer-tagline">
            A pay-it-forward ecosystem for professionals navigating the AI era.
          </p>
          <p className="site-footer-tag">
            AI needs Tokens.<br />Humans need Tokans.
          </p>
        </div>
        {SITEMAP.map((col) => (
          <div key={col.heading} className="site-footer-col">
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="site-footer-bottom">
        <span>© 2026 Tokans.org · Not bought. Not transferred. Not gamified.</span>
        <span>AI needs Tokens. Humans need Tokans.™</span>
      </div>
    </footer>
  );
}

// ── Use-case context panel (image + text), reused by auth + content pages ────
export function ContextPanel({ content }: { content: PanelContent }) {
  return (
    <aside className="auth-split-left">
      <div className="auth-pane-body">
        <div className="auth-pane-eyebrow">{content.eyebrow}</div>
        <h1 className="auth-pane-title">{content.title}</h1>
        <p className="auth-pane-subtitle">{content.subtitle}</p>
        {content.points && content.points.length > 0 && (
          <ul className="auth-pane-points">
            {content.points.map((p) => (
              <li key={p} className="auth-pane-point">
                <span className="auth-pane-check" aria-hidden="true">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <img className="auth-pane-img" src={content.image} alt={content.imageAlt} />
    </aside>
  );
}

// ── Full page layout: header + (context | content) + footer ─────────────────
export function PageLayout({
  content,
  children,
}: {
  content: PanelContent;
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="auth-split">
        <ContextPanel content={content} />
        <main className="auth-split-right auth-split-right--top">
          <div className="page-content">{children}</div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
