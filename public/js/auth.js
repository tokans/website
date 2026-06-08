/**
 * Static auth page wiring (replaces the former React AuthScreen + modal).
 *
 * One page (public/auth.html) serves /founders, /join, /hire, /professionals and
 * /login — Vercel rewrites all of them to /auth, so the flow is derived from
 * window.location.pathname. The use-case panel copy is read from
 * /data/authContexts.json. On success the form POSTs to /api/auth/{signup,signin}
 * (which sets the session cookie) and redirects into the React app at /app.
 */
import { api } from "./api.js";
import { qs, escapeHtml, fetchJson } from "./html.js";

const FLOW_BY_PATH = {
  "/founders": "founders",
  "/join": "join",
  "/hire": "hire",
  "/professionals": "professionals",
};

const OAUTH_ERRORS = {
  github: "GitHub sign-in failed. Please try again.",
  google: "Google sign-in failed. Please try again.",
  state: "Authentication failed (state mismatch). Please try again.",
  no_email:
    "We couldn't retrieve a verified email from your account. Please sign up with email instead.",
};

function currentFlow() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return FLOW_BY_PATH[path] ?? null;
}

function friendlyError(err) {
  const msg = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(msg))
    return "Couldn't reach the server. Check your connection and try again.";
  if (/invalid credentials/i.test(msg)) return "Email or password is incorrect.";
  if (/email.*required|password.*required/i.test(msg))
    return "Email and password are required.";
  return msg || "Something went wrong. Please try again.";
}

function init() {
  const root = document.getElementById("auth-root");
  if (!root) return;
  void api.initCsrf();

  const flow = currentFlow();
  const redirectTarget = flow ? `/app?flow=${encodeURIComponent(flow)}` : "/app";

  // Already signed in? Skip the form and go straight into the app.
  api.session()
    .then((d) => { if (d && "authenticated" in d && d.authenticated) window.location.href = redirectTarget; })
    .catch(() => undefined);

  const els = {
    panel: qs(root, "#auth-panel"),
    split: qs(root, "#auth-split"),
    wordmark: qs(root, "#auth-wordmark"),
    title: qs(root, "#auth-title"),
    subtitle: qs(root, "#auth-subtitle"),
    fieldName: qs(root, "#field-name"),
    name: qs(root, "#auth-name"),
    email: qs(root, "#auth-email"),
    password: qs(root, "#auth-password"),
    errName: qs(root, "#err-name"),
    errEmail: qs(root, "#err-email"),
    errPassword: qs(root, "#err-password"),
    serverErr: qs(root, "#auth-error"),
    submit: qs(root, "#auth-submit"),
    toggle: qs(root, "#auth-toggle"),
    form: qs(root, "#auth-form"),
    github: qs(root, "#auth-github"),
    google: qs(root, "#auth-google"),
  };

  let mode = flow ? "signup" : "signin"; // flow entry points default to signup

  // ── Panel: filled from JSON for flow pages; hidden (centered card) for /login.
  if (flow) {
    els.wordmark?.setAttribute("hidden", "");
    fetchJson("/data/authContexts.json", {}).then((ctxs) => {
      const ctx = ctxs[flow];
      if (!ctx || !els.panel) return;
      qs(els.panel, "#pane-eyebrow").textContent = ctx.eyebrow;
      qs(els.panel, "#pane-title").textContent = ctx.title;
      qs(els.panel, "#pane-subtitle").textContent = ctx.subtitle;
      const points = qs(els.panel, "#pane-points");
      points.innerHTML = (ctx.points || [])
        .map(
          (p) =>
            `<li class="auth-pane-point"><span class="auth-pane-check" aria-hidden="true">✓</span><span>${escapeHtml(p)}</span></li>`,
        )
        .join("");
      const img = qs(els.panel, "#pane-img");
      img.src = ctx.image;
      img.alt = ctx.imageAlt;
      els.panel.removeAttribute("hidden");
      mode = ctx.defaultView === "login" ? "signin" : "signup";
      applyMode();
    });
  } else {
    els.panel?.setAttribute("hidden", "");
    if (els.split) els.split.style.gridTemplateColumns = "1fr";
  }

  // ── OAuth redirect error (from /api/auth/*-callback → /login?oauth_error=…).
  const params = new URLSearchParams(window.location.search);
  const oauthErr = params.get("oauth_error");
  if (oauthErr && OAUTH_ERRORS[oauthErr]) showServerError(OAUTH_ERRORS[oauthErr]);

  function showServerError(msg) {
    if (!els.serverErr) return;
    if (msg) {
      els.serverErr.textContent = msg;
      els.serverErr.removeAttribute("hidden");
    } else {
      els.serverErr.textContent = "";
      els.serverErr.setAttribute("hidden", "");
    }
  }

  function clearFieldErrors() {
    els.errName.textContent = "";
    els.errEmail.textContent = "";
    els.errPassword.textContent = "";
  }

  function applyMode() {
    const signup = mode === "signup";
    els.fieldName?.toggleAttribute("hidden", !signup);
    els.title.textContent = signup ? "Create your account" : "Welcome back";
    els.subtitle.textContent = signup
      ? "Join professionals navigating the AI era — contribution verified, opportunity matched."
      : "Sign in to access your Tokan profile and opportunities.";
    els.password.placeholder = signup ? "At least 8 characters" : "Your password";
    els.submit.textContent = signup ? "Create account →" : "Sign in →";
    els.toggle.innerHTML = signup
      ? `Already have an account? <button type="button" class="auth-toggle-btn" id="auth-toggle-btn">Sign in</button>`
      : `Don't have an account? <button type="button" class="auth-toggle-btn" id="auth-toggle-btn">Sign up</button>`;
    qs(els.toggle, "#auth-toggle-btn")?.addEventListener("click", () => {
      mode = signup ? "signin" : "signup";
      clearFieldErrors();
      showServerError("");
      applyMode();
    });
  }

  function validate() {
    clearFieldErrors();
    let ok = true;
    if (mode === "signup") {
      if (!els.name.value.trim()) { els.errName.textContent = "Required"; ok = false; }
      if (!els.email.value.includes("@")) { els.errEmail.textContent = "Enter a valid email"; ok = false; }
      if (els.password.value.length < 8) { els.errPassword.textContent = "Minimum 8 characters"; ok = false; }
    } else {
      if (!els.email.value.trim()) { els.errEmail.textContent = "Enter your email"; ok = false; }
      if (!els.password.value) { els.errPassword.textContent = "Enter your password"; ok = false; }
    }
    return ok;
  }

  async function submit() {
    if (!validate()) return;
    els.submit.disabled = true;
    const label = els.submit.textContent;
    els.submit.textContent = "Please wait…";
    showServerError("");
    try {
      if (mode === "signup") {
        await api.signup({
          name: els.name.value.trim(),
          email: els.email.value.trim(),
          password: els.password.value,
        });
      } else {
        await api.signin({ email: els.email.value.trim(), password: els.password.value });
      }
      window.location.href = redirectTarget;
    } catch (err) {
      showServerError(friendlyError(err));
      els.submit.disabled = false;
      els.submit.textContent = label;
    }
  }

  els.form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void submit();
  });
  els.github?.addEventListener("click", () => api.githubLogin());
  els.google?.addEventListener("click", () => api.googleLogin());

  applyMode();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
