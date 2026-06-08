import type {
  AuthResponse,
  OnboardingCompleteBody,
  SessionResponse,
  RoleId,
  SubType,
  ProfessionalStatus,
  ProfessionalOnboardBody,
  DownloadGrant,
  SubscriptionStatus,
  AppListing,
  AppRegisterBody,
  PartnerListing,
  ConnectionResult,
  SeedProfile,
  TokanTaskAnswers,
  EmployerBriefBody,
} from "./lib/types.js";

const BASE = ""; // same-origin; Vercel routes /api/* automatically
const CSRF_COOKIE = "tokans_csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name: string): string | null {
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

let _csrfBootstrap: Promise<string | null> | null = null;

/** Ensure a CSRF cookie exists; cached so we only hit /api/csrf once per page. */
async function ensureCsrf(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  if (!_csrfBootstrap) {
    _csrfBootstrap = fetch(`${BASE}/api/csrf`, { credentials: "include" })
      .then(() => readCookie(CSRF_COOKIE))
      .catch(() => null);
  }
  return _csrfBootstrap;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };

  if (mutating) {
    const token = await ensureCsrf();
    if (token) headers[CSRF_HEADER] = token;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data["error"] as string | undefined) ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  /** Call once on app load to prime the CSRF cookie. */
  initCsrf: () => ensureCsrf(),

  signup: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  signin: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  session: () =>
    request<SessionResponse | { authenticated: false }>("/api/auth/session"),

  // OAuth — full-page redirects, not fetch calls
  githubLogin: (): void => { window.location.href = "/api/auth/github"; },
  googleLogin: (): void => { window.location.href = "/api/auth/google"; },

  // Onboarding
  completeOnboarding: (body: {
    role:       RoleId;
    subType?:   SubType | null;
    context?:   Record<string, unknown>;
    entryPath?: string | null;
  }) =>
    request<{ ok: boolean }>("/api/onboarding/complete", {
      method: "POST",
      body:   JSON.stringify(body satisfies OnboardingCompleteBody),
    }),

  // ── Professionals (P0) ──────────────────────────────────────────────────────
  professionalOnboard: (body: ProfessionalOnboardBody) =>
    request<ProfessionalStatus>("/api/professionals/onboard", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  professionalStatus: () =>
    request<ProfessionalStatus>("/api/professionals/status"),

  professionalDownload: () =>
    request<DownloadGrant>("/api/professionals/download"),

  // ── Payments (P0) ───────────────────────────────────────────────────────────
  donateCheckout: (body: { amountMinor: number; currency?: string; email?: string | null }) =>
    request<{ url: string }>("/api/donate/checkout", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  subscribe: (body: { plan?: string } = {}) =>
    request<{ url: string }>("/api/professionals/subscribe", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  subscriptionStatus: () =>
    request<SubscriptionStatus>("/api/professionals/subscription"),

  // ── Apps support directory (P1) ─────────────────────────────────────────────
  listApps: () =>
    request<{ apps: AppListing[] }>("/api/apps"),

  registerApp: (body: AppRegisterBody) =>
    request<AppListing>("/api/apps", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  requestAppSupport: (id: string) =>
    request<AppListing>(`/api/apps/${id}/request-support`, {
      method: "POST",
      body:   JSON.stringify({}),
    }),

  // ── Partner directory + connections (P1) ────────────────────────────────────
  listPartners: () =>
    request<{ partners: PartnerListing[] }>("/api/partners"),

  connect: (body: { professionalUserId: string; message: string }) =>
    request<ConnectionResult>("/api/connections", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  // ── Employer brief + First Tokan Task (P1) ──────────────────────────────────
  saveEmployerBrief: (body: EmployerBriefBody) =>
    request<{ briefId: string | null }>("/api/employer/brief", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  getTokanTask: () =>
    request<{ profile: SeedProfile | null; remaining: number }>("/api/tokan-task"),

  submitTokanTask: (body: { seedProfileId: string; answers: TokanTaskAnswers }) =>
    request<{ ok: boolean; tokanAwarded: boolean; remaining: number }>("/api/tokan-task", {
      method: "POST",
      body:   JSON.stringify(body),
    }),
};
