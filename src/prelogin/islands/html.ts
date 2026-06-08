/**
 * Tiny vanilla-DOM helpers for the pre-login island pages.
 *
 * These pages render plain HTML (no React) from JSON, the same way
 * src/chrome/chrome.ts renders the shared header/footer. Because we build markup
 * from template strings, nothing auto-escapes — so escapeHtml() is MANDATORY for
 * any user-provided value, and safeUrl() guards href attributes.
 */

/** Escape a string for safe interpolation into HTML text or a double-quoted attr. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allow only http(s) URLs in href attributes; everything else (javascript:,
 * data:, …) collapses to empty so it can't be used as an injection vector.
 * Returns an already-escaped string safe to drop into `href="…"`.
 */
export function safeUrl(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  return escapeHtml(raw);
}

/** querySelector that throws nothing — returns null if absent. */
export function qs<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T | null {
  return root.querySelector<T>(selector);
}

/** Run mount() now, or on DOMContentLoaded if the document is still parsing. */
export function onReady(fn: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}
