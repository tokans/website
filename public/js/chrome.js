/**
 * Shared chrome for the static prelogin pages. Injects the marketing navbar and
 * footer into [data-chrome] slots and wires the hamburger/scroll behaviour.
 *
 * Markup is NOT defined here — it lives in hand-editable HTML partials:
 *   • public/partials/header-prelogin.html  → export `headerPrelogin`
 *   • public/partials/footer.html           → export `footer`
 * Both are inlined at build time into public/js/partials.generated.js (run
 * `npm run build:partials`) and imported below, so they inject SYNCHRONOUSLY —
 * no flash and no runtime fetch (a live fetch of /partials/*.html breaks under
 * `vercel dev`, where cleanUrls redirects the .html URL to a path that 404s).
 *
 * The React post-login app reads the SAME partials (footer.html + its own
 * header-app.html) via Vite `?raw` in src/chrome/chrome.ts.
 *
 * Styling comes from the prebuilt /css/site.css (compiled from chrome.css + tailwind).
 */

import { headerPrelogin, footer } from "./partials.generated.js";

/** Pre-login marketing navbar markup (source: public/partials/header-prelogin.html). */
export function navbarHTML() {
  return headerPrelogin;
}

/** Shared footer markup (source: public/partials/footer.html). */
export function footerHTML() {
  return footer;
}

/** Wire the injected navbar: hamburger toggle, backdrop, scroll state, Escape. */
function wireNavbar() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("navHamburger");
  const menu = document.getElementById("navMobileMenu");
  const backdrop = document.getElementById("navBackdrop");

  if (navbar) {
    window.addEventListener(
      "scroll",
      () => navbar.classList.toggle("scrolled", window.scrollY > 10),
      { passive: true },
    );
  }

  if (!hamburger || !menu || !backdrop) return;

  const open = () => {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    hamburger.classList.add("active");
    hamburger.setAttribute("aria-expanded", "true");
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    hamburger.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
    backdrop.classList.remove("active");
    document.body.style.overflow = "";
  };

  hamburger.addEventListener("click", () =>
    menu.classList.contains("open") ? close() : open(),
  );
  backdrop.addEventListener("click", close);
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  window.addEventListener(
    "resize",
    () => { if (window.innerWidth > 768) close(); },
    { passive: true },
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

/** Inject + wire the chrome. Both header and footer are set synchronously. */
export function mount() {
  const headerSlot = document.querySelector('[data-chrome="header"]');
  if (headerSlot) {
    headerSlot.outerHTML = navbarHTML();
    wireNavbar();
  }
  const footerSlot = document.querySelector('[data-chrome="footer"]');
  if (footerSlot) footerSlot.outerHTML = footerHTML();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
