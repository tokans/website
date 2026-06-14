/**
 * /donate island — vanilla-JS donation widget (amount + email + checkout
 * redirect) rendered into the static donate.html shell. Ported from the former
 * src/prelogin/islands/donate.ts; chrome + CSS are loaded by the page.
 */
import { api } from "./api.js";
import { escapeHtml, qs, onReady } from "./html.js";

const PRESETS_RUPEES = [500, 1000, 2500, 5000];
const MIN_RUPEES = 50;

const inr = (n) => n.toLocaleString("en-IN");

// ── Pure render (exported for tests) ───────────────────────────────────────────
export function donateFormHTML(outcome = "") {
  const presets = PRESETS_RUPEES.map(
    (p) => `<button type="button" class="ui-btn ui-btn--ghost" data-preset="${p}">₹${escapeHtml(inr(p))}</button>`,
  ).join("");

  const cancelNotice =
    outcome === "cancel"
      ? `<div class="ui-info ui-info--neutral u-mt-16">Your donation was cancelled — no charge was made.</div>`
      : "";

  return `
<div class="ui-card" style="--ui-card-max-w:480px">
  <div class="ui-fade-in">
    <div class="ui-step-header">
      <div class="ui-step-eyebrow">MAKE A DONATION</div>
      <div class="ui-step-title">Choose an amount</div>
      <div class="ui-step-sub">Anonymous-friendly — no sign-in required. Funds go to professional access and support.</div>
    </div>

    ${cancelNotice}

    <div class="ui-field u-mt-16">
      <label class="ui-field-label">Amount (₹)</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">${presets}</div>
      <input class="ui-input" type="number" id="donate-amount" value="1000" placeholder="Minimum ₹${MIN_RUPEES}" />
    </div>

    <div class="ui-field">
      <label class="ui-field-label">Email</label>
      <input class="ui-input" type="email" id="donate-email" placeholder="you@example.com" />
      <div class="ui-field-hint">Optional — for your receipt</div>
    </div>

    <div id="donate-error"></div>

    <button type="button" class="ui-btn ui-btn--primary ui-btn--full u-mt-24" id="donate-submit">Donate ₹${escapeHtml(inr(1000))} →</button>
  </div>
</div>`.trim();
}

export function donateSuccessHTML() {
  return `
<div class="ui-card" style="--ui-card-max-w:480px">
  <div class="ui-fade-in">
    <div class="done-tick">✓</div>
    <div class="ui-step-header">
      <div class="ui-step-title">Thank you</div>
      <div class="ui-step-sub">Your support helps professionals navigating the AI transition. Every contribution is pay-it-forward.</div>
    </div>
    <button type="button" class="ui-btn ui-btn--primary ui-btn--full u-mt-24" id="donate-home">Back to Tokans →</button>
  </div>
</div>`.trim();
}

function comingSoonHTML() {
  return `
<div class="ui-card" style="--ui-card-max-w:480px">
  <div class="ui-fade-in" style="text-align:center;padding:2rem 0">
    <div style="font-size:2.5rem;margin-bottom:1rem">🤝</div>
    <div class="ui-step-header">
      <div class="ui-step-eyebrow">COMING SOON</div>
      <div class="ui-step-title">Donations opening soon</div>
      <div class="ui-step-sub" style="max-width:340px;margin:0 auto">
        We're finalising our payment setup. In the meantime, reach out at
        <a href="mailto:hello@tokans.org" style="color:inherit;text-decoration:underline">hello@tokans.org</a>
        if you'd like to support the mission.
      </div>
    </div>
    <a href="/" class="ui-btn ui-btn--primary ui-btn--full" style="margin-top:2rem;display:block">Back to Tokans →</a>
  </div>
</div>`.trim();
}

// ── Mount + wiring ──────────────────────────────────────────────────────────────
export function mount() {
  const root = document.getElementById("donate-island");
  if (!root) return;
  root.innerHTML = comingSoonHTML();
}

onReady(mount);
