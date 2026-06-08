/**
 * /donate island — vanilla-TS donation widget (amount + email + checkout
 * redirect) rendered into the static donate.html shell. Replaces the former
 * React DonateForm; the surrounding chrome and use-case copy are static HTML.
 */
import "../tailwind.css";
import "../index.css";
import "../chrome/mount.js";
import { api } from "../api.js";
import { escapeHtml, qs, onReady } from "./html.js";

const PRESETS_RUPEES = [500, 1000, 2500, 5000];
const MIN_RUPEES = 50;

const inr = (n: number) => n.toLocaleString("en-IN");

// ── Pure render (exported for tests) ───────────────────────────────────────────
export function donateFormHTML(outcome: "" | "cancel" = ""): string {
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

export function donateSuccessHTML(): string {
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

// ── Mount + wiring ──────────────────────────────────────────────────────────────
function mount(): void {
  const root = document.getElementById("donate-island");
  if (!root) return;

  void api.initCsrf();

  const status = new URLSearchParams(window.location.search).get("status");

  if (status === "success") {
    root.innerHTML = donateSuccessHTML();
    qs<HTMLButtonElement>(root, "#donate-home")?.addEventListener("click", () => {
      window.location.href = "/";
    });
    return;
  }

  root.innerHTML = donateFormHTML(status === "cancel" ? "cancel" : "");

  const amountEl = qs<HTMLInputElement>(root, "#donate-amount");
  const emailEl = qs<HTMLInputElement>(root, "#donate-email");
  const submitEl = qs<HTMLButtonElement>(root, "#donate-submit");
  const errorEl = qs<HTMLDivElement>(root, "#donate-error");
  if (!amountEl || !submitEl) return;

  const rupees = () => Number(amountEl.value);
  const isValid = () => Number.isFinite(rupees()) && rupees() >= MIN_RUPEES;

  const syncButton = () => {
    submitEl.textContent = `Donate ₹${isValid() ? inr(rupees()) : "…"} →`;
    submitEl.disabled = !isValid();
  };

  // Preset buttons set the amount.
  for (const btn of root.querySelectorAll<HTMLButtonElement>("button[data-preset]")) {
    btn.addEventListener("click", () => {
      amountEl.value = btn.dataset.preset ?? "";
      syncButton();
    });
  }
  amountEl.addEventListener("input", syncButton);

  submitEl.addEventListener("click", () => {
    if (!isValid()) return;
    submitEl.disabled = true;
    submitEl.textContent = "Redirecting…";
    if (errorEl) errorEl.innerHTML = "";
    api
      .donateCheckout({
        amountMinor: Math.round(rupees() * 100),
        currency: "INR",
        email: emailEl?.value.trim() || null,
      })
      .then(({ url }) => {
        window.location.href = url;
      })
      .catch((e: unknown) => {
        if (errorEl) {
          errorEl.innerHTML = `<div class="ui-info ui-info--error u-mt-16">${escapeHtml(
            e instanceof Error ? e.message : "Could not start the donation",
          )}</div>`;
        }
        syncButton();
      });
  });

  syncButton();
}

onReady(mount);
