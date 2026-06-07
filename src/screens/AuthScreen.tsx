import { useState, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { api } from "../api.js";
import { Wordmark, Card, Field, Input, BtnPrimary, BtnSocial, Divider, FadeIn } from "../components/ui.js";
import { SiteHeader, SiteFooter, ContextPanel } from "../components/site.js";
import type { SessionResponse } from "../lib/types.js";
import type { AuthContext } from "../data/authContexts.js";

function GithubIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.59c1.52-1.4 2.4-3.46 2.4-5.87z" fill="#4285F4" />
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.95l-2.6-2a4.8 4.8 0 01-2.7.75 4.79 4.79 0 01-4.5-3.32H.82v2.07A8 8 0 008 16z" fill="#34A853" />
      <path d="M3.5 9.48A4.83 4.83 0 013.25 8c0-.52.09-1.02.25-1.48V4.45H.82A8 8 0 000 8c0 1.29.31 2.51.82 3.55l2.68-2.07z" fill="#FBBC05" />
      <path d="M8 3.2c1.21 0 2.3.42 3.16 1.24l2.37-2.37A8 8 0 00.82 4.45L3.5 6.52A4.79 4.79 0 018 3.2z" fill="#EA4335" />
    </svg>
  );
}

type Mode = "signup" | "signin";

interface FormState {
  name:     string;
  email:    string;
  password: string;
}

interface FormErrors {
  name?:     string;
  email?:    string;
  password?: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "" };

export default function AuthScreen({
  initialView = "signup",
  oauthError  = "",
  onSuccess,
  context,
}: {
  /** Which tab to open on. Driven by the modal trigger ("login" | "engineer").
   *  Maps to "signin" | "signup" internally. Defaults to "signup". */
  initialView?: "login" | "signup";
  oauthError?:  string;
  onSuccess:    (session: SessionResponse) => void;
  /** Use-case panel for role-scoped entry points (/professionals, /join, /hire).
   *  When set, the screen renders split: panel on the left, form on the right. */
  context?:     AuthContext;
}) {
  // Map the external "login" / "signup" vocabulary to internal Mode
  const viewToMode = (v: "login" | "signup"): Mode =>
    v === "login" ? "signin" : "signup";

  const [mode,      setMode]      = useState<Mode>(viewToMode(initialView));
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [serverErr, setServerErr] = useState(oauthError);
  const [loading,   setLoading]   = useState(false);

  // When the parent changes initialView (modal reopened with a different trigger)
  // reset to the requested tab and clear all form state.
  useEffect(() => {
    setMode(viewToMode(initialView));
    setForm(EMPTY_FORM);
    setErrors({});
    setServerErr("");
  }, [initialView]);

  // Keep serverErr in sync if oauthError changes after mount (e.g. OAuth redirect)
  useEffect(() => {
    setServerErr(oauthError);
  }, [oauthError]);

  const set = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (mode === "signup") {
      if (!form.name.trim())         e.name     = "Required";
      if (!form.email.includes("@")) e.email    = "Enter a valid email";
      if (form.password.length < 8)  e.password = "Minimum 8 characters";
    } else {
      // Signin: don't enforce client-side strength — let the server decide.
      // We only need both fields present so the request is well-formed.
      if (!form.email.trim())    e.email    = "Enter your email";
      if (!form.password)        e.password = "Enter your password";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const friendlyError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : "";
    // Network / connectivity failure — fetch throws TypeError with these strings.
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    if (/invalid credentials/i.test(msg)) {
      return "Email or password is incorrect.";
    }
    if (/email.*required|password.*required/i.test(msg)) {
      return "Email and password are required.";
    }
    return msg || "Something went wrong. Please try again.";
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const data = mode === "signup"
        ? await api.signup(form)
        : await api.signin({ email: form.email, password: form.password });
      onSuccess({
        authenticated: true,
        user: {
          userId:             data.user.id,
          name:               data.user.name,
          email:              data.user.email,
          onboardingComplete: data.onboardingComplete,
        },
      });
    } catch (err) {
      setServerErr(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setMode((m) => (m === "signup" ? "signin" : "signup"));
    setErrors({});
    setServerErr("");
  };

  const formCard = (
    <Card maxWidth={440}>

      <div className="auth-header">
        {!context && <Wordmark />}
        <div className="auth-title">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </div>
        <div className="auth-subtitle">
          {mode === "signup"
            ? "Join professionals navigating the AI era — contribution verified, opportunity matched."
            : "Sign in to access your Tokan profile and opportunities."}
        </div>
      </div>

      <BtnSocial onClick={() => api.githubLogin()} className="u-mb-10">
        <GithubIcon /> Continue with GitHub
      </BtnSocial>
      <BtnSocial onClick={() => api.googleLogin()}>
        <GoogleIcon /> Continue with Google
      </BtnSocial>

      <Divider />

      {mode === "signup" && (
        <Field label="Full Name" error={errors.name}>
          <Input placeholder="Your name" value={form.name} onChange={set("name")} />
        </Field>
      )}

      <Field label="Email Address" error={errors.email}>
        <Input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
      </Field>

      <Field label="Password" error={errors.password}>
        <Input
          type="password"
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          value={form.password}
          onChange={set("password")}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") void submit(); }}
        />
      </Field>

      {serverErr && <div className="auth-error">{serverErr}</div>}

      <BtnPrimary onClick={() => void submit()} disabled={loading}>
        {loading ? "Please wait…" : mode === "signup" ? "Create account →" : "Sign in →"}
      </BtnPrimary>

      <div className="auth-toggle">
        {mode === "signup" ? (
          <>Already have an account?{" "}
            <button type="button" onClick={toggle} className="auth-toggle-btn">Sign in</button>
          </>
        ) : (
          <>Don't have an account?{" "}
            <button type="button" onClick={toggle} className="auth-toggle-btn">Sign up</button>
          </>
        )}
      </div>

    </Card>
  );

  // ── Split layout: use-case panel (left) + form (right) ──────────────────────
  if (context) {
    return (
      <div className="page-shell">
        <SiteHeader />
        <div className="auth-split">
          <ContextPanel content={context} />
          <main className="auth-split-right">
            <FadeIn k="auth">{formCard}</FadeIn>
            <div className="auth-terms">
              By continuing, you agree to Tokans' Terms of Service and Privacy Policy.
            </div>
          </main>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // ── Default / modal layout: single centered card ────────────────────────────
  return (
    <div className="auth-wrap">
      <FadeIn k="auth">{formCard}</FadeIn>

      <div className="auth-terms">
        By continuing, you agree to Tokans' Terms of Service and Privacy Policy.
      </div>
    </div>
  );
}