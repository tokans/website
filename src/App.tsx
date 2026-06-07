import { useState, useEffect } from "react";
import { api } from "./api.js";
import AuthScreen from "./screens/AuthScreen.js";
import Onboarding from "./screens/Onboarding.js";
import Dashboard  from "./screens/Dashboard.js";
import Professionals from "./screens/Professionals.js";
import Donate from "./screens/Donate.js";
import Apps from "./screens/Apps.js";
import Partners from "./screens/Partners.js";
import FirstTokanTask from "./screens/FirstTokanTask.js";
import MwaMount from "./screens/MwaMount.js";
import type { SessionResponse, SessionPayload, RoleId } from "./lib/types.js";
import { getAuthContext } from "./data/authContexts.js";

// ── App state ─────────────────────────────────────────────────────────────────
type AppSession =
  | null                                   // loading
  | { authenticated: false }               // not logged in
  | { authenticated: true; user: SessionPayload }; // logged in

// Maps the modal trigger type to the view AuthScreen should open on.
// "engineer" → signup tab; "login" → login tab; anything else → default.
type AuthView = "login" | "signup";
function modeToView(mode: string): AuthView {
  if (mode === "login") return "login";
  return "signup"; // "engineer" and any future types default to signup
}

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

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppProps {
  /** Passed by main.tsx when rendering inside the site modal.
   *  "login"    → open on the login tab
   *  "engineer" → open on the sign-up tab
   *  ""         → modal was closed; reset auth state so forms clear on reopen
   *  Omit entirely when rendering standalone (dev / own page). */
  mode?: string;
}

export default function App({ mode }: AppProps) {
  const [session,   setSession]   = useState<AppSession>(null);
  const [oauthMsg,  setOauthMsg]  = useState("");

  // Standalone-only entry flows selected via the path (/donate, /professionals,
  // /professionals/subscribe) or a ?flow=… query param.
  const [flow] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname;
    const q = new URLSearchParams(window.location.search).get("flow") ?? "";
    if (path === "/donate" || q === "donate") return "donate";
    if (path === "/apps" || q === "apps") return "apps";
    // /founders is the auth-gated founder entry to list an app (→ Apps screen).
    if (path === "/founders" || q === "founders") return "founders";
    if (path === "/partners" || q === "partners") return "partners";
    if (path === "/join" || q === "join") return "join";   // supply: Opportunity Seeker
    if (path === "/hire" || q === "hire") return "hire";   // demand: Employer
    if (path === "/tokan-task" || q === "tokan-task") return "tokan-task";
    if (path.startsWith("/professionals") || q === "professionals") return "professionals";
    return q;
  });

  // /join and /hire are the same onboarding engine with a pre-selected role.
  const initialRole: RoleId | undefined =
    flow === "join" ? "opportunity_seeker" : flow === "hire" ? "employer" : undefined;

  // Role-scoped entry points get a split auth screen with a use-case panel on
  // the left. Standalone only — the modal (mode set) keeps the compact card.
  const authContext = mode === undefined ? getAuthContext(flow) : undefined;

  // The myWorkAssistant cockpit is served from the /myWorkAssistant path.
  const isMwaPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/myWorkAssistant");

  // ── React to modal open / close signals ───────────────────────────────────
  useEffect(() => {
    // mode === "" means auth:close fired — reset so forms are fresh on reopen
    if (mode === "") {
      setSession({ authenticated: false });
      setOauthMsg("");
      return;
    }

    // A real mode arrived (login / engineer / …): drop back to the auth screen
    // so the correct tab is shown, even if the user was already browsing the app.
    if (mode !== undefined) {
      setSession({ authenticated: false });
    }
  }, [mode]);

  // ── Prime the CSRF cookie before any mutating request ────────────────────
  useEffect(() => {
    void api.initCsrf();
  }, []);

  // ── Detect OAuth redirect result from URL params ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("oauth");
    const oauthError  = params.get("oauth_error");

    if (oauthError === "github")   setOauthMsg("GitHub sign-in failed. Please try again.");
    if (oauthError === "google")   setOauthMsg("Google sign-in failed. Please try again.");
    if (oauthError === "state")    setOauthMsg("Authentication failed (state mismatch). Please try again.");
    if (oauthError === "no_email") setOauthMsg("We couldn't retrieve a verified email from your account. Please sign up with email instead.");
    if (oauthResult || oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Check existing session on mount (standalone only) ─────────────────────
  // Skip the session check when running inside the modal; the user will
  // authenticate through the modal flow rather than a pre-existing cookie.
  useEffect(() => {
    if (mode !== undefined) return; // modal context — don't check session

    api.session()
      .then((data) => {
        if ("authenticated" in data && data.authenticated) {
          setSession(data as SessionResponse);
        } else {
          setSession({ authenticated: false });
        }
      })
      .catch(() => setSession({ authenticated: false }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthSuccess = (s: SessionResponse) => setSession(s);

  const handleOnboardingComplete = (s: { authenticated: true; user: SessionPayload }) =>
    setSession(s);

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setSession({ authenticated: false });
  };

  // ── Routing ────────────────────────────────────────────────────────────────

  // Donations are anonymous — render before any auth/session gate (standalone only).
  if (mode === undefined && flow === "donate") {
    return <Donate />;
  }

  // Apps support directory is public — render before the auth gate too.
  if (mode === undefined && flow === "apps") {
    return <Apps />;
  }

  // Partner directory is public — render before the auth gate too.
  if (mode === undefined && flow === "partners") {
    return <Partners />;
  }

  // In modal context show the auth screen immediately (no splash while loading)
  if (session === null) {
    if (mode !== undefined) {
      return (
        <AuthScreen
          initialView={modeToView(mode)}
          oauthError={oauthMsg}
          onSuccess={handleAuthSuccess}
        />
      );
    }
    return <Splash />;
  }

  if (!session.authenticated) {
    const initialView =
      mode !== undefined
        ? modeToView(mode)
        : authContext
          ? authContext.defaultView
          : "login";
    return (
      <AuthScreen
        initialView={initialView}
        oauthError={oauthMsg}
        onSuccess={handleAuthSuccess}
        {...(authContext ? { context: authContext } : {})}
      />
    );
  }

  // myWorkAssistant cockpit (mounted sub-app) — once authenticated, the
  // /myWorkAssistant path hands the whole viewport to the embedded bundle.
  if (mode === undefined && isMwaPath) {
    return <MwaMount user={session.user} />;
  }

  // Professional onboarding + download gate (standalone only; separate from the
  // talent-role onboarding above, so it renders regardless of onboardingComplete).
  if (mode === undefined && flow === "professionals") {
    return (
      <Professionals
        user={session.user}
        onLogout={() => void handleLogout()}
      />
    );
  }

  // Founders: after sign-in, land on the Apps screen to list their app.
  // (Signed-out founders hit the split auth screen above via the founders context.)
  if (mode === undefined && flow === "founders") {
    return <Apps />;
  }

  // First Tokan Task (Opportunity Seeker "aha"; reachable after /join or from the dashboard).
  if (mode === undefined && flow === "tokan-task") {
    return (
      <FirstTokanTask
        user={session.user}
        onDone={() => { window.location.href = "/"; }}
      />
    );
  }

  if (!session.user.onboardingComplete) {
    return (
      <Onboarding
        user={session.user}
        onComplete={handleOnboardingComplete}
        onLogout={() => void handleLogout()}
        {...(initialRole ? { initialRole } : {})}
      />
    );
  }

  return <Dashboard user={session.user} onLogout={() => void handleLogout()} />;
}