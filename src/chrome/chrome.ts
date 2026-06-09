/**
 * Shared chrome for the React post-login app — the header and footer as plain
 * HTML strings, wrapped by SiteHeader / SiteFooter in components/site.tsx.
 *
 * The markup is NOT defined here — it comes from the hand-editable partials,
 * inlined at build time by Vite `?raw` (synchronous, no flash):
 *   • public/partials/header-app.html  → the post-login app header
 *   • public/partials/footer.html      → the shared footer (the static prelogin
 *     pages fetch this SAME file live via public/js/chrome.js)
 *
 * The pre-login marketing navbar lives in public/partials/header-prelogin.html.
 * Edit the .html partials, not this file. Styling uses the shared Tailwind
 * tokens/classes defined in src/tailwind.css.
 */
import headerApp from "../../public/partials/header-app.html?raw";
import footer from "../../public/partials/footer.html?raw";

/** Strip the leading editor-facing HTML comment so it doesn't render. */
const clean = (html: string): string =>
  html.replace(/^\s*<!--[\s\S]*?-->\s*/, "").trim();

/** Post-login app header markup (source: public/partials/header-app.html). */
export function headerHTML(): string {
  return clean(headerApp);
}

/** Footer markup with sitemap (source: public/partials/footer.html). */
export function footerHTML(): string {
  return clean(footer);
}
