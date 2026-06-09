/**
 * /apps island — vanilla-JS apps directory (browse listed apps) rendered into
 * the static apps.html shell. Ported from the former src/prelogin/islands/apps.ts;
 * chrome (/js/chrome.js) and CSS (/css/site.css) are loaded by the page, the
 * use-case copy is static HTML. Listing your own app is a CTA below the carousel
 * (→ /founders), not an in-deck form.
 */
import { api } from "./api.js";
import { escapeHtml, safeUrl, qs, onReady } from "./html.js";
import { deckHTML, initDeck } from "./carousel.js";

// ── Pure render (exported for tests) ───────────────────────────────────────────
export function appRowHTML(a) {
  const pill = a.listed ? "SUPPORTED" : escapeHtml(a.supportStatus.toUpperCase());
  const repo = a.repoUrl && safeUrl(a.repoUrl)
    ? ` · <a href="${safeUrl(a.repoUrl)}" target="_blank" rel="noopener noreferrer">repo ↗</a>`
    : "";
  // iconUrl is server-controlled (seed/DB) and same-origin; still guard the shape.
  const iconSrc = a.iconUrl && /^\/[\w./-]+$/.test(a.iconUrl) ? a.iconUrl : null;
  const icon = iconSrc
    ? `<img src="${escapeHtml(iconSrc)}" alt="" width="40" height="40" loading="lazy" style="width:40px;height:40px;flex:none;border-radius:9px;object-fit:cover;border:1px solid #e5e3df;background:#fff" />`
    : `<span aria-hidden="true" style="width:40px;height:40px;flex:none;border-radius:9px;display:grid;place-items:center;font-weight:700;font-size:18px;background:#eef4fb;color:#2b6cb0">${escapeHtml((a.name.trim()[0] ?? "?").toUpperCase())}</span>`;
  return `
<div class="ui-barrier">
  <div style="display:flex;gap:12px;align-items:flex-start">
    ${icon}
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <strong>${escapeHtml(a.name)}</strong>
        <span class="dash-role-pill">${pill}</span>
      </div>
      ${a.tagline ? `<div class="ui-barrier-text">${escapeHtml(a.tagline)}</div>` : ""}
      <div class="ui-field-hint">${a.stack ? `${escapeHtml(a.stack)} · ` : ""}${a.usesSharedCoreLib ? "sharedCoreLib" : "custom"}${repo}</div>
    </div>
  </div>
</div>`.trim();
}

export function appsListHTML(apps) {
  if (apps === null) return `<div class="ui-step-sub u-mt-16">Loading…</div>`;
  if (apps.length === 0)
    return `<div class="ui-info ui-info--neutral u-mt-16">No apps listed yet.</div>`;
  return `<div class="u-mt-16" style="display:grid;gap:12px">${apps.map(appRowHTML).join("")}</div>`;
}

// ── Mount + wiring ──────────────────────────────────────────────────────────────
export function mount() {
  const root = document.getElementById("apps-island");
  if (!root) return;

  root.innerHTML = `
<div class="ui-card" style="--ui-card-max-w:560px">
  <div class="ui-step-title">Browse listed apps</div>
  <div id="apps-deck">${appsListHTML(null)}</div>
</div>
<div class="dir-cta">Built an app already? <a href="/founders">List your app →</a></div>
<div class="dir-cta">Build one using our <a target="_blank" href="https://github.com/tokans/sharedCoreLib">sharedCoreLib →</a></div>`.trim();

  const deckEl = qs(root, "#apps-deck");
  if (!deckEl) return;

  // One app per slide so the directory fits the viewport without scrolling.
  api.listApps()
    .then((res) => res.apps ?? [])
    .catch(() => [])
    .then((apps) => {
      if (!apps.length) {
        deckEl.innerHTML = appsListHTML([]);
        return;
      }
      deckEl.innerHTML = deckHTML(apps.map(appRowHTML));
      initDeck(deckEl);
    });
}

onReady(mount);
