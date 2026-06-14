/**
 * Plain-JS API client for the static prelogin pages (ported from the subset of
 * src/api.ts those pages use). Same-origin fetch + CSRF cookie bootstrap; the
 * Vercel platform routes /api/* to the serverless functions.
 *
 * Kept deliberately small — only the endpoints the public pages call. The React
 * post-login app keeps its own typed src/api.ts; keep the two in sync.
 */

const CSRF_COOKIE = "tokans_csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name) {
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

let _csrfBootstrap = null;

/** Ensure a CSRF cookie exists; cached so we only hit /api/csrf once per page. */
async function ensureCsrf() {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  if (!_csrfBootstrap) {
    _csrfBootstrap = fetch("/api/csrf", { credentials: "include" })
      .then(() => readCookie(CSRF_COOKIE))
      .catch(() => null);
  }
  return _csrfBootstrap;
}

async function request(path, opts = {}) {
  const method = (opts.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };

  if (mutating) {
    const token = await ensureCsrf();
    if (token) headers[CSRF_HEADER] = token;
  }

  const res = await fetch(path, { ...opts, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const api = {
  /** Call once on page load to prime the CSRF cookie. */
  initCsrf: () => ensureCsrf(),

  signup: (body) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),

  signin: (body) =>
    request("/api/auth/signin", { method: "POST", body: JSON.stringify(body) }),

  session: () => request("/api/auth/session"),

  logout: () =>
    request("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),

  forgotPassword: (email) =>
    request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token, password) =>
    request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  // OAuth — full-page redirects, not fetch calls.
  githubLogin: () => { window.location.href = "/api/auth/github"; },
  googleLogin: () => { window.location.href = "/api/auth/google"; },

  // Donations (anonymous-friendly).
  donateCheckout: (body) =>
    request("/api/donate/checkout", { method: "POST", body: JSON.stringify(body) }),

  // Apps support directory.
  listApps: () => request("/api/apps"),
  registerApp: (body) =>
    request("/api/apps", { method: "POST", body: JSON.stringify(body) }),
  requestAppSupport: (id) =>
    request(`/api/apps/${id}/request-support`, { method: "POST", body: JSON.stringify({}) }),

  // Partner directory + connections.
  listPartners: () => request("/api/partners"),
  connect: (body) =>
    request("/api/connections", { method: "POST", body: JSON.stringify(body) }),
};
