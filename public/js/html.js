/**
 * Tiny vanilla-DOM helpers for the static prelogin pages (ported from the former
 * src/prelogin/islands/html.ts). These pages build markup from template strings,
 * so nothing auto-escapes — escapeHtml() is MANDATORY for any value that could be
 * user-provided, and safeUrl() guards href attributes.
 */

/** Escape a string for safe interpolation into HTML text or a double-quoted attr. */
export function escapeHtml(value) {
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
export function safeUrl(value) {
  const raw = (value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  return escapeHtml(raw);
}

/** querySelector that returns null if absent (no throw). */
export function qs(root, selector) {
  return root.querySelector(selector);
}

/** Run fn now, or on DOMContentLoaded if the document is still parsing. */
export function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

/** Fetch + parse a JSON file (same-origin), returning fallback on any failure. */
export async function fetchJson(url, fallback = null) {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}
