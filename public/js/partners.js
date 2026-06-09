/**
 * /partners island — vanilla-JS partner directory rendered into the static
 * partners.html shell. Ported from the former src/prelogin/islands/partners.ts.
 * Profession labels and the sample fallback are read from JSON at runtime
 * (/data/professions.json, /data/sampleProfessionals.json); real listings come
 * from /api/partners. Chrome + CSS are loaded by the page.
 */
import { api } from "./api.js";
import { escapeHtml, qs, onReady, fetchJson } from "./html.js";
import { deckHTML, initDeck } from "./carousel.js";

// Populated from /data/professions.json on mount; empty until then (rows fall
// back to the partner's roleCategory for the pill label).
const PROFESSION_LABEL = new Map();

// ── Pure render (exported for tests) ───────────────────────────────────────────
export function partnerRowHTML(p, s) {
  const label = (p.profession && PROFESSION_LABEL.get(p.profession)) ?? p.roleCategory;
  const id = escapeHtml(p.id);

  let action;
  if (s.sent) {
    action = `<div class="ui-info ui-info--success u-mt-8">Request sent — it's now in their inbox.</div>`;
  } else if (!s.authed) {
    action = `<div class="ui-field-hint u-mt-8"><a href="/login">Sign in</a> to connect.</div>`;
  } else if (s.open) {
    action = `
<div class="u-mt-8">
  <div class="ui-field">
    <label class="ui-field-label">Message</label>
    <textarea class="ui-input ui-textarea" data-message="${id}" maxlength="500" style="--ui-textarea-min-h:72px" placeholder="Describe what you need help with…"></textarea>
  </div>
  ${s.err ? `<div class="ui-info ui-info--error u-mt-8">${escapeHtml(s.err)}</div>` : ""}
  <div style="display:flex;gap:8px">
    <button type="button" class="ui-btn ui-btn--primary" data-send="${id}">Send request →</button>
    <button type="button" class="ui-btn ui-btn--ghost" data-cancel="${id}">Cancel</button>
  </div>
</div>`.trim();
  } else {
    action = `<button type="button" class="ui-btn ui-btn--primary u-mt-8" data-connect="${id}">Connect →</button>`;
  }

  return `
<div class="ui-barrier" data-partner="${id}">
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
    <strong>${escapeHtml(p.name ?? "Professional")}</strong>
    <span class="dash-role-pill">${escapeHtml(label)}</span>
  </div>
  ${p.headline ? `<div class="ui-barrier-text">${escapeHtml(p.headline)}</div>` : ""}
  ${p.skills.length > 0 ? `<div class="ui-field-hint">${escapeHtml(p.skills.join(" · "))}</div>` : ""}
  ${action}
</div>`.trim();
}

export function partnersListHTML(partners, rowState) {
  if (partners === null) return `<div class="ui-step-sub">Loading…</div>`;
  if (partners.length === 0)
    return `<div class="ui-info ui-info--neutral">No partners listed yet.</div>`;
  return `<div style="display:grid;gap:12px">${partners.map((p) => partnerRowHTML(p, rowState(p))).join("")}</div>`;
}

// ── Mount + wiring ──────────────────────────────────────────────────────────────
export function mount() {
  const root = document.getElementById("partners-island");
  if (!root) return;

  void api.initCsrf();
  // Carousel (the card) with a "list your own" CTA pinned below it (→ /professionals).
  root.innerHTML = `
<div class="ui-card" id="partners-card">${partnersListHTML(null, () => ({ authed: false, sent: false, open: false }))}</div>
<div class="dir-cta">Are you a professional? <a href="/professionals">Get listed →</a></div>`.trim();
  const card = qs(root, "#partners-card");
  if (!card) return;

  let partners = null;
  let authed = false;
  let openId = null;
  let deckIndex = 0;
  const sentTo = new Set();
  const errors = new Map();

  const rowState = (p) => {
    const err = errors.get(p.id);
    return {
      authed,
      sent: sentTo.has(p.id),
      open: openId === p.id,
      ...(err !== undefined ? { err } : {}),
    };
  };
  // One professional per slide so the directory fits without scrolling; the
  // carousel position is preserved across re-renders (connect/send/cancel).
  const render = () => {
    if (!partners || partners.length === 0) {
      card.innerHTML = partnersListHTML(partners, rowState);
      return;
    }
    const slides = partners.map((p) => partnerRowHTML(p, rowState(p)));
    card.innerHTML = deckHTML(slides);
    initDeck(card, { index: deckIndex, onChange: (i) => { deckIndex = i; } });
  };

  // Profession label lookup (for the pills) — repaint once it lands.
  fetchJson("/data/professions.json", []).then((profs) => {
    for (const p of profs) PROFESSION_LABEL.set(p.id, p.label);
    if (partners) render();
  });

  // Real listings, falling back to the sample directory when the backend is empty.
  Promise.all([
    api.listPartners().catch(() => ({ partners: [] })),
    fetchJson("/data/sampleProfessionals.json", []),
  ]).then(([r, sample]) => {
    partners = r.partners && r.partners.length ? r.partners : sample;
    render();
  });

  api.session()
    .then((d) => { if ("authenticated" in d && d.authenticated) { authed = true; render(); } })
    .catch(() => undefined);

  card.addEventListener("click", (ev) => {
    const el = ev.target;
    const connect = el.closest("button[data-connect]");
    const cancel = el.closest("button[data-cancel]");
    const send = el.closest("button[data-send]");

    if (connect) {
      openId = connect.dataset.connect ?? null;
      errors.clear();
      render();
    } else if (cancel) {
      openId = null;
      render();
    } else if (send) {
      const id = send.dataset.send;
      if (!id || !partners) return;
      const p = partners.find((x) => x.id === id);
      if (!p) return;
      const ta = card.querySelector(`textarea[data-message="${CSS.escape(id)}"]`);
      send.disabled = true;
      send.textContent = "Sending…";
      errors.delete(id);
      api.connect({ professionalUserId: p.professionalUserId, message: ta?.value.trim() ?? "" })
        .then(() => { sentTo.add(id); openId = null; render(); })
        .catch((e) => {
          errors.set(id, e instanceof Error ? e.message : "Could not send the request");
          render();
        });
    }
  });
}

onReady(mount);
