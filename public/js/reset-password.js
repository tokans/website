/**
 * Wires the reset-password page (public/reset-password.html).
 * Reads ?token= from the URL, shows the form, submits to /api/auth/reset-password.
 */
import { api } from "./api.js";

function qs(sel) { return document.querySelector(sel); }

function init() {
  void api.initCsrf();

  const token = new URLSearchParams(window.location.search).get("token");
  const form       = qs("#reset-form");
  const password   = qs("#reset-password");
  const confirm    = qs("#reset-confirm");
  const errPw      = qs("#err-reset-password");
  const errConf    = qs("#err-reset-confirm");
  const serverErr  = qs("#reset-error");
  const submit     = qs("#reset-submit");
  const successEl  = qs("#reset-success");
  const invalidEl  = qs("#reset-invalid");

  if (!token) {
    form?.setAttribute("hidden", "");
    invalidEl?.removeAttribute("hidden");
    return;
  }

  function showError(msg) {
    if (!serverErr) return;
    if (msg) { serverErr.textContent = msg; serverErr.removeAttribute("hidden"); }
    else { serverErr.textContent = ""; serverErr.setAttribute("hidden", ""); }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errPw) errPw.textContent = "";
    if (errConf) errConf.textContent = "";
    showError("");

    let ok = true;
    if (!password.value || password.value.length < 8) {
      if (errPw) errPw.textContent = "Minimum 8 characters";
      ok = false;
    }
    if (password.value !== confirm.value) {
      if (errConf) errConf.textContent = "Passwords don't match";
      ok = false;
    }
    if (!ok) return;

    submit.disabled = true;
    submit.textContent = "Updating…";

    try {
      await api.resetPassword(token, password.value);
      form.setAttribute("hidden", "");
      successEl?.removeAttribute("hidden");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/expired|invalid/i.test(msg)) {
        form.setAttribute("hidden", "");
        invalidEl?.removeAttribute("hidden");
      } else {
        showError(msg || "Something went wrong. Please try again.");
        submit.disabled = false;
        submit.textContent = "Set new password →";
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
