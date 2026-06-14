import { useState, useEffect } from "react";
import { api } from "./api.js";
import Onboarding from "./screens/Onboarding.js";
import Dashboard  from "./screens/Dashboard.js";
import Professionals from "./screens/Professionals.js";
import FirstTokanTask from "./screens/FirstTokanTask.js";
import MwaMount from "./screens/MwaMount.js";
import type { SessionResponse, SessionPayload, RoleId } from "./lib/types.js";

// ── App state ─────────────────────────────────────────────────────────────────
type AppSession =
  | null                                   // loading
  | { authenticated: false }               // not logged in (→ redirect to auth)
  | { authenticated: true; user: SessionPayload }; // logged in

// Where to send an unauthenticated visitor. Flow entry points have their own
// static auth landing (with a use-case panel); everything else → generic /login.
const AUTH_PAGE_BY_FLOW: Record<string, string> = {
  founders: "/founders",
  join: "/join",
  hire: "/hire",
  professionals: "/professionals",
};

function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">
        Tok<span className="splash-logo-accent">ans</span>
      </div>
      <div className="splash-bar">
        <div className="splash-bar-fill" />
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession]         = useState<AppSession>(null);
  const [reOnboarding, setReOnboarding] = useState(false);

  // Entry flow selected via the path (/professionals, rewritten /tokan-task,
  // /myWorkAssistant) or a ?flow=… query param (set by the static auth redirect).
  const [flow] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname;
    const q = new URLSearchParams(window.location.search).get("flow") ?? "";
    if (path === "/founders" || q === "founders") return "founders";
    if (path === "/join" || q === "join") return "join";   // supply: Opportunity Seeker
    if (path === "/hire" || q === "hire") return "hire";   // demand: Employer
    if (path === "/tokan-task" || q === "tokan-task") return "tokan-task";
    if (path.startsWith("/professionals") || q === "professionals") return "professionals";
    return q;
  });

  // /join and /hire are the same onboarding engine with a pre-selected role.
  const initialRole: RoleId | undefined =
    flow === "join" ? "opportunity_seeker" : flow === "hire" ? "employer" : undefined;

  // The myWorkAssistant cockpit is served (via rewrite) from /myWorkAssistant.
  const isMwaPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/myWorkAssistant");

  // ── Prime the CSRF cookie before any mutating request ────────────────────
  useEffect(() => {
    void api.initCsrf();
  }, []);

  // ── Check the session on mount; bounce to the static auth page if absent ──
  useEffect(() => {
    api.session()
      .then((data) => {
        if ("authenticated" in data && data.authenticated) {
          setSession(data as SessionResponse);
        } else {
          redirectToAuth();
        }
      })
      .catch(() => redirectToAuth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function redirectToAuth() {
    setSession({ authenticated: false });
    if (typeof window !== "undefined") {
      window.location.href = AUTH_PAGE_BY_FLOW[flow] ?? "/login";
    }
  }

  const handleOnboardingComplete = (s: { authenticated: true; user: SessionPayload }) =>
    setSession(s);

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    if (typeof window !== "undefined") window.location.href = "/";
  };

  // ── Loading / unauthenticated (redirect in flight) ─────────────────────────
  if (session === null || !session.authenticated) {
    return <Splash />;
  }

  // myWorkAssistant cockpit (mounted sub-app).
  if (isMwaPath) {
    return <MwaMount user={session.user} />;
  }

  // Professional onboarding + download gate (separate from the talent-role
  // onboarding, so it renders regardless of onboardingComplete).
  if (flow === "professionals") {
    return (
      <Professionals
        user={session.user}
        onLogout={() => void handleLogout()}
      />
    );
  }

  // Per-path journeys run exactly once each.
  const completedJourneys = session.user.completedJourneys ?? [];
  const journeyDone = (path: string) => completedJourneys.includes(path);

  // Founders: run the founders journey once, then land on the static /apps page.
  if (flow === "founders") {
    if (!journeyDone("founders")) {
      return (
        <Onboarding
          user={session.user}
          onComplete={handleOnboardingComplete}
          onLogout={() => void handleLogout()}
          entryPath="founders"
        />
      );
    }
    window.location.href = "/apps";
    return <Splash />;
  }

  // First Tokan Task (reachable after /join or from the dashboard).
  if (flow === "tokan-task") {
    return (
      <FirstTokanTask
        user={session.user}
        onDone={() => { window.location.href = "/"; }}
      />
    );
  }

  // Join / Hire: run that path's journey once, then proceed to the dashboard.
  if (flow === "join" || flow === "hire") {
    if (!journeyDone(flow)) {
      return (
        <Onboarding
          user={session.user}
          onComplete={handleOnboardingComplete}
          onLogout={() => void handleLogout()}
          entryPath={flow}
          {...(initialRole ? { initialRole } : {})}
        />
      );
    }
    return (
      <Dashboard
        user={session.user}
        onLogout={() => void handleLogout()}
        onChangeProfile={() => setReOnboarding(true)}
      />
    );
  }

  // Default entry: the generic role-picker onboarding runs once, gated by the
  // global onboardingComplete flag.
  if (!session.user.onboardingComplete || reOnboarding) {
    return (
      <Onboarding
        user={session.user}
        onComplete={(s) => { setReOnboarding(false); handleOnboardingComplete(s); }}
        onLogout={() => void handleLogout()}
        entryPath={flow}
        reOnboarding={reOnboarding}
        {...(initialRole ? { initialRole } : {})}
      />
    );
  }

  return (
    <Dashboard
      user={session.user}
      onLogout={() => void handleLogout()}
      onChangeProfile={() => setReOnboarding(true)}
    />
  );
}
