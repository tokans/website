import type { ReactNode } from "react";
import { headerHTML, footerHTML } from "../chrome/chrome.js";

/** Shared header/footer/context chrome for every standalone page.
 *  The header and footer markup come from chrome.ts — the SAME source the
 *  static HTML shells inject — so React islands and static pages stay identical
 *  and match the marketing landing. */

interface PanelContent {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  points?: string[];
}

// ── Top header bar (shared source) ──────────────────────────────────────────
export function SiteHeader({
  backHref = "/",
  backLabel = "Home",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return <div dangerouslySetInnerHTML={{ __html: headerHTML({ backHref, backLabel }) }} />;
}

// ── Footer with sitemap (shared source) ─────────────────────────────────────
export function SiteFooter() {
  return <div className="contents" dangerouslySetInnerHTML={{ __html: footerHTML() }} />;
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
