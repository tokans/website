/**
 * Static-shell chrome bootstrapper.
 *
 * Each static HTML page includes:
 *   <div data-chrome="header" data-back-href="/" data-back-label="Apps"></div>
 *   …page content…
 *   <div data-chrome="footer"></div>
 *   <script type="module" src="/src/chrome/mount.ts"></script>
 *
 * This injects the shared header/footer (single source: chrome.ts) so static
 * pages match the React islands and the landing exactly.
 */
import { headerHTML, footerHTML, type HeaderOptions } from "./chrome.js";
import "../tailwind.css";

function mount() {
  const headerSlot = document.querySelector<HTMLElement>('[data-chrome="header"]');
  if (headerSlot) {
    const opts: HeaderOptions = {};
    const backHref = headerSlot.dataset.backHref;
    const backLabel = headerSlot.dataset.backLabel;
    if (backHref) opts.backHref = backHref;
    if (backLabel) opts.backLabel = backLabel;
    if (headerSlot.dataset.hideBack === "true") opts.hideBack = true;
    headerSlot.outerHTML = headerHTML(opts);
  }

  const footerSlot = document.querySelector<HTMLElement>('[data-chrome="footer"]');
  if (footerSlot) footerSlot.outerHTML = footerHTML();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
