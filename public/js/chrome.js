/**
 * Shared chrome for the static prelogin pages (ported from src/chrome/chrome.ts
 * navbarHTML/footerHTML + src/chrome/mount.ts). Injects the marketing navbar and
 * footer into [data-chrome] slots and wires the hamburger/scroll behaviour.
 *
 * Unlike the old React build, these pages have no auth modal — the "Sign in"
 * CTA is a real link to /login (which serves the static auth page). Styling
 * comes from the prebuilt /css/site.css (compiled from chrome.css + tailwind).
 *
 * The React post-login app keeps its own src/chrome/chrome.ts; keep the nav and
 * footer link lists here in sync with it.
 */

const SITEMAP = [
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

const wordmark = (size, cls = "") =>
  `<span class="wordmark ${cls}" style="font-size:${size}px">Tok<span class="wordmark-ans">ans</span></span>`;

/** Marketing navbar markup. Sign-in CTA navigates to the static /login page. */
export function navbarHTML() {
  return `
<nav id="navbar" aria-label="Main navigation">
  <a href="/" class="nav-logo" aria-label="Tokans home">
    <img src="/images/logo.png" alt="" class="nav-logo-img" aria-hidden="true" />Tok<span class="logo-ans"><i><u>ans</u></i></span>
  </a>
  <div class="nav-actions">
    <a href="/#what-is-tokans" class="nav-link">What are Tokans?</a>
    <a href="/login" class="btn btn-primary nav-cta">Sign In / Sign Up</a>
    <button class="nav-hamburger" id="navHamburger" aria-label="Open menu" aria-expanded="false" aria-controls="navMobileMenu">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-mobile-menu" id="navMobileMenu" aria-hidden="true" role="dialog" aria-label="Navigation menu">
    <a href="/#what-is-tokans" class="nav-mobile-link">What are Tokans?</a>
    <a href="/#roles" class="nav-mobile-link">Who it's for</a>
    <a href="/#how-it-works" class="nav-mobile-link">How it works</a>
    <a href="/#audit-strip" class="nav-mobile-link">Book an assessment</a>
    <div class="nav-mobile-actions">
      <a href="/founders" class="btn btn-primary">Get your codebase assessed</a>
      <a href="/join" class="btn btn-outline">I'm an engineer →</a>
    </div>
  </div>
  <div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>
</nav>`.trim();
}

/** Footer markup with sitemap. Dark navy, matching the marketing landing. */
export function footerHTML() {
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
