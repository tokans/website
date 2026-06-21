/**
 * /apps/<slug> detail island — renders a native tokans.org app page (hero,
 * features, demo, downloads) into the public app-detail.html shell.
 *
 * Content comes from GET /api/apps/<slug> (server/apps/[id].ts resolves by slug)
 * which returns the AppListing plus its `content` payload (AppContent). The page
 * is anonymous; chrome (/js/chrome.js) and CSS (/css/site.css) are loaded by the
 * shell. The Download button is OS-detected client-side and links straight to the
 * matching installer; other platforms are listed beneath it.
 */
import { escapeHtml, safeUrl, onReady, fetchJson } from "./html.js";

// ── OS detection ────────────────────────────────────────────────────────────────
/** Best-effort visitor OS → one of windows | macos | linux | android | null. */
export function detectOs(nav = typeof navigator !== "undefined" ? navigator : {}) {
  const plat = String(nav.userAgentData?.platform || nav.platform || "").toLowerCase();
  const ua = String(nav.userAgent || "").toLowerCase();
  // Android must be checked before Linux — Android UAs contain "linux".
  if (plat.includes("android") || ua.includes("android")) return "android";
  if (plat.includes("win") || ua.includes("windows")) return "windows";
  // iPadOS reports "MacIntel"; there's no iOS build, so macOS is the right bucket.
  if (plat.includes("mac") || ua.includes("mac os x") || ua.includes("macintosh")) return "macos";
  if (plat.includes("linux") || plat.includes("x11") || ua.includes("linux")) return "linux";
  return null;
}

const DOWNLOAD_OSES = ["windows", "macos", "linux", "android"];

/**
 * Stable same-origin link to the latest-release download for a platform. The
 * server (GET /api/apps/<slug>/download?os=<os>) resolves the newest GitHub
 * release at click time and 302-redirects, so links never pin to a stale tag.
 */
export function downloadHref(slug, os) {
  return `/api/apps/${encodeURIComponent(slug)}/download?os=${encodeURIComponent(os)}`;
}

/**
 * Split downloads into the one to feature (matching the visitor's OS) and the
 * rest. With no detection / no match, everything is "other" (all shown equally).
 * Entries only need a recognised `os` — the actual URL is resolved server-side.
 */
export function pickDownloads(downloads, os) {
  const list = Array.isArray(downloads) ? downloads.filter((d) => d && DOWNLOAD_OSES.includes(d.os)) : [];
  if (!list.length) return { primary: null, others: [] };
  const idx = os ? list.findIndex((d) => d.os === os) : -1;
  if (idx === -1) return { primary: null, others: list };
  return { primary: list[idx], others: list.filter((_, i) => i !== idx) };
}

// ── Render helpers ──────────────────────────────────────────────────────────────
function downloadBtn(d, slug, primary) {
  const cls = primary ? "btn btn-primary btn-lg" : "btn btn-outline";
  return `<a class="${cls}" href="${escapeHtml(downloadHref(slug, d.os))}">⬇ ${escapeHtml(d.label || d.os)}</a>`;
}

function downloadsHTML(downloads, slug, os) {
  const { primary, others } = pickDownloads(downloads, os);
  if (!primary && !others.length) return "";
  if (!primary) {
    // No OS match — present every platform as an equal choice.
    return `<div class="ad-ctas">${others.map((d) => downloadBtn(d, slug, others.length === 1)).join("")}</div>`;
  }
  const otherLinks = others.length
    ? `<div class="ad-dl-other">Other platforms: ${others
        .map((d) => `<a href="${escapeHtml(downloadHref(slug, d.os))}">${escapeHtml(d.label || d.os)}</a>`)
        .join(" · ")}</div>`
    : "";
  return `<div class="ad-ctas">${downloadBtn(primary, slug, true)}</div>${otherLinks}`;
}

function featuresHTML(features) {
  if (!Array.isArray(features) || !features.length) return "";
  const cards = features
    .map(
      (f) => `
    <div class="ad-feature">
      ${f.icon ? `<div class="ad-feature-ico" aria-hidden="true">${escapeHtml(f.icon)}</div>` : ""}
      <h3>${escapeHtml(f.title || "")}</h3>
      <p>${escapeHtml(f.body || "")}</p>
    </div>`
    )
    .join("");
  return `
  <section class="section section--alt" id="features">
    <div class="container">
      <p class="eyebrow">// Features</p>
      <h2 class="h2">Everything, nothing leaves your device</h2>
      <div class="ad-features">${cards}</div>
    </div>
  </section>`;
}

function demoHTML(demo) {
  if (!demo || !safeUrl(demo.videoUrl)) return "";
  return `
  <section class="section" id="demo">
    <div class="container">
      <p class="eyebrow">// Demo</p>
      <h2 class="h2">See it in action</h2>
      <figure class="ad-demo" id="ad-demo-figure">
        <video src="${safeUrl(demo.videoUrl)}" autoplay muted loop playsinline controls preload="metadata"></video>
        ${demo.caption ? `<figcaption>${escapeHtml(demo.caption)}</figcaption>` : ""}
      </figure>
    </div>
  </section>`;
}

function screenshotsHTML(shots) {
  if (!Array.isArray(shots) || !shots.length) return "";
  const items = shots
    .filter((s) => s && safeUrl(s.url))
    .map(
      (s) => `
    <figure class="ad-shot">
      <img src="${safeUrl(s.url)}" alt="${escapeHtml(s.caption || "Screenshot")}" loading="lazy" />
      ${s.caption ? `<figcaption>${escapeHtml(s.caption)}</figcaption>` : ""}
    </figure>`
    )
    .join("");
  if (!items) return "";
  return `
  <section class="section section--alt" id="screenshots">
    <div class="container">
      <p class="eyebrow">// Screenshots</p>
      <h2 class="h2">A look inside</h2>
      <div class="ad-shots">${items}</div>
    </div>
  </section>`;
}

function privacyHTML(note) {
  if (!note || !note.title) return "";
  return `
  <section class="section">
    <div class="container">
      <div class="ad-privacy">
        <h2 class="h2" style="margin-bottom:0">${escapeHtml(note.title)}</h2>
        ${note.body ? `<p class="lead">${escapeHtml(note.body)}</p>` : ""}
      </div>
    </div>
  </section>`;
}

function iconHTML(app) {
  const src = app.iconUrl && /^\/[\w./-]+$/.test(app.iconUrl) ? app.iconUrl : null;
  return src ? `<img class="ad-icon" src="${escapeHtml(src)}" alt="" width="72" height="72" />` : "";
}

/** Full page markup for a resolved app. */
export function appDetailHTML(app) {
  const content = app.content || {};
  const heroSub = content.heroTagline || app.tagline || app.description || "";
  const secondary = [];
  if (safeUrl(app.repoUrl)) secondary.push(`<a class="btn btn-outline" href="${safeUrl(app.repoUrl)}">View on GitHub</a>`);
  if (safeUrl(app.siteUrl)) secondary.push(`<a class="btn btn-ghost" href="${safeUrl(app.siteUrl)}">Visit site ↗</a>`);

  return `
  <section class="section ad-hero">
    <div class="container">
      ${iconHTML(app)}
      <p class="eyebrow">${app.usesSharedCoreLib ? "// Privacy-native · sharedCoreLib" : "// On the Tokans network"}</p>
      <h1 class="h-hero">${escapeHtml(app.name)}</h1>
      ${heroSub ? `<p class="lead">${escapeHtml(heroSub)}</p>` : ""}
      ${downloadsHTML(content.downloads, app.slug, detectOs())}
      ${secondary.length ? `<div class="ad-ctas">${secondary.join("")}</div>` : ""}
    </div>
  </section>
  ${featuresHTML(content.features)}
  ${demoHTML(content.demo)}
  ${screenshotsHTML(content.screenshots)}
  ${privacyHTML(content.privacyNote)}`;
}

// ── Mount ─────────────────────────────────────────────────────────────────────
function slugFromPath() {
  const path = typeof location !== "undefined" ? location.pathname : "";
  const m = path.match(/\/apps\/([^/?#]+)/i);
  if (m) return decodeURIComponent(m[1]);
  // Fallback for direct hits on /app-detail (e.g. plain `vite` dev, where the
  // /apps/:slug rewrite isn't applied): /app-detail?slug=myfinance
  if (typeof location !== "undefined") {
    return new URLSearchParams(location.search).get("slug") || "";
  }
  return "";
}

function setMeta(app) {
  const sub = (app.content && app.content.heroTagline) || app.tagline || "";
  document.title = `${app.name}${sub ? " — " + sub : ""} · Tokans`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", `https://tokans.org/apps/${app.slug}`);
  const desc = document.querySelector('meta[name="description"]');
  if (desc && (app.tagline || app.description)) desc.setAttribute("content", app.tagline || app.description);
}

export async function mount() {
  const root = document.getElementById("app-detail-island");
  if (!root) return;
  const slug = slugFromPath();
  if (!slug) {
    root.innerHTML = `<div class="ad-state">No app specified. <a href="/apps">Browse the directory →</a></div>`;
    return;
  }

  const app = await fetchJson(`/api/apps/${encodeURIComponent(slug)}`);
  if (!app || !app.slug) {
    root.innerHTML = `
      <div class="ad-state">
        <h2 class="h2">App not found</h2>
        <p class="lead" style="margin:0 auto">We couldn't find an app at this address.
          <a href="/apps">Browse the directory →</a></p>
      </div>`;
    return;
  }

  setMeta(app);
  root.innerHTML = appDetailHTML(app);

  // Hide the demo if the video can't load (mirrors the old standalone page).
  const demoVideo = root.querySelector("#ad-demo-figure video");
  if (demoVideo) {
    demoVideo.addEventListener("error", () => {
      const fig = document.getElementById("demo");
      if (fig) fig.classList.add("hidden");
    });
  }
}

onReady(mount);
