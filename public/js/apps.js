/**
 * /apps island — vanilla-JS apps directory (browse listed apps + owner
 * registration) rendered into the static apps.html shell. Ported from the former
 * src/prelogin/islands/apps.ts; chrome (/js/chrome.js) and CSS (/css/site.css)
 * are loaded by the page, the use-case copy is static HTML.
 */
import { api } from "./api.js";
import { escapeHtml, safeUrl, qs, onReady } from "./html.js";

// ── Pure render (exported for tests) ───────────────────────────────────────────
export function appRowHTML(a) {
  const pill = a.listed ? "SUPPORTED" : escapeHtml(a.supportStatus.toUpperCase());
  const repo = a.repoUrl && safeUrl(a.repoUrl)
    ? ` · <a href="${safeUrl(a.repoUrl)}" target="_blank" rel="noopener noreferrer">repo ↗</a>`
    : "";
  return `
<div class="ui-barrier">
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
    <strong>${escapeHtml(a.name)}</strong>
    <span class="dash-role-pill">${pill}</span>
  </div>
  ${a.tagline ? `<div class="ui-barrier-text">${escapeHtml(a.tagline)}</div>` : ""}
  <div class="ui-field-hint">${a.stack ? `${escapeHtml(a.stack)} · ` : ""}${a.usesSharedCoreLib ? "sharedCoreLib" : "custom"}${repo}</div>
</div>`.trim();
}

export function appsListHTML(apps) {
  if (apps === null) return `<div class="ui-step-sub u-mt-16">Loading…</div>`;
  if (apps.length === 0)
    return `<div class="ui-info ui-info--neutral u-mt-16">No apps listed yet.</div>`;
  return `<div class="u-mt-16" style="display:grid;gap:12px">${apps.map(appRowHTML).join("")}</div>`;
}

function ownerFormHTML() {
  return `
<div class="ui-field u-mt-16">
  <label class="ui-field-label">App name</label>
  <input class="ui-input" id="app-name" placeholder="e.g. myJournal" />
</div>
<div class="ui-field">
  <label class="ui-field-label">Repository URL</label>
  <input class="ui-input" id="app-repo" placeholder="https://github.com/…" />
  <div class="ui-field-hint">Optional</div>
</div>
<div class="ui-field">
  <label class="ui-field-label">Stack</label>
  <textarea class="ui-input ui-textarea" id="app-stack" maxlength="160" style="--ui-textarea-min-h:48px" placeholder="e.g. Tauri + React + sharedCoreLib"></textarea>
</div>
<div id="app-reg-error"></div>
<button type="button" class="ui-btn ui-btn--primary ui-btn--full u-mt-16" id="app-register" disabled>Register app →</button>
<div id="app-mine"></div>`.trim();
}

function mineRowHTML(a) {
  const action =
    a.supportStatus === "none"
      ? `<button type="button" class="ui-btn ui-btn--primary ui-btn--full u-mt-8" data-request="${escapeHtml(a.id)}">Request support →</button>`
      : a.supportStatus === "requested"
        ? `<div class="ui-field-hint">Support requested — pending review.</div>`
        : `<div class="ui-field-hint">Listed for support.</div>`;
  return `
<div class="ui-barrier" data-mine="${escapeHtml(a.id)}">
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
    <strong>${escapeHtml(a.name)}</strong>
    <span class="dash-role-pill">${escapeHtml(a.supportStatus.toUpperCase())}</span>
  </div>
  ${action}
</div>`.trim();
}

function signInHTML() {
  return `<div class="ui-info ui-info--gold u-mt-16"><a href="/login">Sign in</a> to list your app for Tokans support.</div>`;
}

// ── Mount + wiring ──────────────────────────────────────────────────────────────
export function mount() {
  const root = document.getElementById("apps-island");
  if (!root) return;

  void api.initCsrf();

  root.innerHTML = `
<div class="ui-card" style="--ui-card-max-w:720px">
  <div class="ui-step-header"><div class="ui-step-eyebrow">DIRECTORY</div><div class="ui-step-title">Browse listed apps</div></div>
  <div id="apps-list">${appsListHTML(null)}</div>
</div>
<div class="ui-card u-mt-16" style="--ui-card-max-w:720px">
  <div class="ui-step-header"><div class="ui-step-eyebrow">LIST YOUR APP</div><div class="ui-step-title">Get your app supported</div></div>
  <div id="apps-owner"></div>
</div>`.trim();

  const listEl = qs(root, "#apps-list");
  const ownerEl = qs(root, "#apps-owner");

  api.listApps()
    .then((r) => { if (listEl) listEl.innerHTML = appsListHTML(r.apps); })
    .catch(() => { if (listEl) listEl.innerHTML = appsListHTML([]); });

  api.session()
    .then((d) => {
      const authed = "authenticated" in d && d.authenticated;
      if (!ownerEl) return;
      if (!authed) { ownerEl.innerHTML = signInHTML(); return; }
      ownerEl.innerHTML = ownerFormHTML();
      wireOwnerForm(ownerEl);
    })
    .catch(() => { if (ownerEl) ownerEl.innerHTML = signInHTML(); });
}

function wireOwnerForm(ownerEl) {
  const nameEl = qs(ownerEl, "#app-name");
  const repoEl = qs(ownerEl, "#app-repo");
  const stackEl = qs(ownerEl, "#app-stack");
  const registerEl = qs(ownerEl, "#app-register");
  const errEl = qs(ownerEl, "#app-reg-error");
  const mineEl = qs(ownerEl, "#app-mine");
  if (!nameEl || !registerEl || !mineEl) return;

  const mine = [];
  const renderMine = () => {
    mineEl.innerHTML = mine.length
      ? `<div class="u-mt-24" style="display:grid;gap:12px"><div class="done-next-eyebrow">YOUR APPS</div>${mine.map(mineRowHTML).join("")}</div>`
      : "";
  };

  const sync = () => { registerEl.disabled = !nameEl.value.trim(); };
  nameEl.addEventListener("input", sync);

  registerEl.addEventListener("click", () => {
    const name = nameEl.value.trim();
    if (!name) return;
    registerEl.disabled = true;
    registerEl.textContent = "Registering…";
    if (errEl) errEl.innerHTML = "";
    api.registerApp({
      name,
      repoUrl: repoEl?.value.trim() || null,
      stack: stackEl?.value.trim() || null,
    })
      .then((app) => {
        mine.unshift(app);
        nameEl.value = ""; if (repoEl) repoEl.value = ""; if (stackEl) stackEl.value = "";
        renderMine();
      })
      .catch((e) => {
        if (errEl) errEl.innerHTML = `<div class="ui-info ui-info--error u-mt-16">${escapeHtml(e instanceof Error ? e.message : "Could not register the app")}</div>`;
      })
      .finally(() => { registerEl.textContent = "Register app →"; sync(); });
  });

  // Delegated request-support clicks (rows are re-rendered).
  mineEl.addEventListener("click", (ev) => {
    const target = ev.target.closest("button[data-request]");
    if (!target) return;
    const id = target.dataset.request;
    if (!id) return;
    target.disabled = true;
    if (errEl) errEl.innerHTML = "";
    api.requestAppSupport(id)
      .then((updated) => {
        const i = mine.findIndex((a) => a.id === id);
        if (i >= 0) mine[i] = updated;
        renderMine();
      })
      .catch((e) => {
        target.disabled = false;
        if (errEl) errEl.innerHTML = `<div class="ui-info ui-info--error u-mt-16">${escapeHtml(e instanceof Error ? e.message : "Could not request support")}</div>`;
      });
  });

  sync();
}

onReady(mount);
