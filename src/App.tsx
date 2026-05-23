import { useState, useEffect } from "react";
import { api } from "./api.js";
import AuthScreen from "./screens/AuthScreen.js";
import Onboarding from "./screens/Onboarding.js";
import Dashboard  from "./screens/Dashboard.js";
import type { SessionResponse, SessionPayload } from "./lib/types.js";

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
    return (
      <AuthScreen
        initialView={mode !== undefined ? modeToView(mode) : "login"}
        oauthError={oauthMsg}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (!session.user.onboardingComplete) {
    return (
      <Onboarding
        user={session.user}
        onComplete={handleOnboardingComplete}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return <Dashboard user={session.user} onLogout={() => void handleLogout()} />;
}