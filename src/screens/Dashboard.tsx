import { useState, useRef, useEffect } from "react";
import { api } from "../api.js";
import { Wordmark } from "../components/ui.js";
import type { RoleId, SessionPayload } from "../lib/types.js";

// ── Employer q5–q7 brief section ──────────────────────────────────────────────
function EmployerBriefSection() {
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState("");
  const [q7, setQ7] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const canSave = q5.trim() && q6.trim() && q7.trim();

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setErr("");
    try {
      await api.saveEmployerBrief({
        technicalSetup: q5.trim(),
        engagementType: q6.trim(),
        budgetRange: q7.trim(),
      });
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="dash-employer-brief">
        <div className="dash-employer-brief-title">Brief questions — complete ✓</div>
        <div className="dash-employer-brief-note">Your full brief has been submitted. We'll be in touch within 24 hours.</div>
      </div>
    );
  }

  return (
    <div className="dash-employer-brief">
      <div className="dash-employer-brief-title">Complete your brief — questions 5–7</div>
      <div className="dash-employer-brief-note">These three questions complete your hiring brief. We need them before we can send your shortlist.</div>
      <div className="dash-employer-brief-fields">
        {[
          { key: "q5", label: "5. What is your current technical setup?", val: q5, set: setQ5,
            placeholder: "e.g. Monolith on Heroku, MySQL, React frontend — no CI/CD yet…" },
          { key: "q6", label: "6. What type of engagement are you looking for?", val: q6, set: setQ6,
            placeholder: "e.g. 3-month contract initially, open to hire. Need someone available Indian time zones…" },
          { key: "q7", label: "7. What is your budget range?", val: q7, set: setQ7,
            placeholder: "e.g. ₹1.5L–2.5L/month for contract, or ₹18–24L CTC for hire…" },
        ].map(({ key, label, val, set, placeholder }) => (
          <div key={key} className="dash-modal-field">
            <label className="ui-field-label">{label}</label>
            <textarea
              className="ui-textarea"
              placeholder={placeholder}
              value={val}
              onChange={(e) => { set(e.target.value); setSaved(false); }}
              rows={3}
              maxLength={400}
            />
          </div>
        ))}
      </div>
      {err && <div className="dash-modal-error" style={{ marginTop: 8 }}>{err}</div>}
      <button
        type="button"
        className="ui-btn ui-btn--primary u-mt-16"
        onClick={() => void handleSave()}
        disabled={!canSave || saving}
      >
        {saving ? "Saving…" : "Submit remaining questions →"}
      </button>
    </div>
  );
}

const ROLE_LABELS: Record<RoleId, string> = {
  opportunity_seeker: "Opportunity Seeker",
  builder:            "Builder",
  employer:           "Employer",
  mentor:             "Mentor",
  donor:              "Mission Backer",
  angel:              "Angel / Scout",
};

interface NextItem {
  icon:     string;
  headline: string;
  body:     string;
}

const ROLE_NEXT: Record<RoleId, NextItem> = {
  opportunity_seeker: {
    icon: "◎",
    headline: "Your First Tokan Task is waiting",
    body: "Review a peer profile to earn your first Tokan and unlock your own profile visibility. Takes about 8 minutes.",
  },
  builder: {
    icon: "⬡",
    headline: "We're setting up your Builder profile",
    body: "Check the inbox connected to your website for a verification email. Click confirm to make your co-founder brief live.",
  },
  employer: {
    icon: "◈",
    headline: "Your brief is under review",
    body: "Our team will review your answers within 24 hours. We may reach out for a quick calibration call before sending your shortlist.",
  },
  mentor: {
    icon: "◉",
    headline: "Start earning Tokans now",
    body: "The fastest path to Mentor status is consistent contribution. Complete your Opportunity Seeker profile first to start building your score.",
  },
  donor: {
    icon: "◇",
    headline: "Identity verification is next",
    body: "Check your inbox for the verification steps. Once confirmed, you can sponsor specific users or contribute to the general fund.",
  },
  angel: {
    icon: "◆",
    headline: "Investor profile under review",
    body: "We're verifying your LinkedIn or AngelList profile. Expect confirmation within 48 hours — then Builder profiles open up for you.",
  },
};

const PLACEHOLDER_STATS = [
  { label: "Total Tokans",   val: "—", sub: "Not yet earned"   },
  { label: "Tokan Velocity", val: "—", sub: "Last 90 days"     },
  { label: "Profile Score",  val: "—", sub: "Pending review"   },
];

export default function Dashboard({
  user, onLogout, onChangeProfile,
}: {
  user:            SessionPayload;
  onLogout:        () => void;
  onChangeProfile: () => void;
}) {
  const [loggingOut, setLoggingOut]       = useState(false);
  const [dropOpen, setDropOpen]           = useState(false);
  const [changePwOpen, setChangePwOpen]   = useState(false);
  const [currentPw, setCurrentPw]         = useState("");
  const [newPw, setNewPw]                 = useState("");
  const [pwError, setPwError]             = useState("");
  const [pwSuccess, setPwSuccess]         = useState(false);
  const [pwBusy, setPwBusy]               = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const role      = (user.role ?? "opportunity_seeker") as RoleId;
  const firstName = user.name?.split(" ")[0] ?? "there";
  const roleLabel = ROLE_LABELS[role];
  const next      = ROLE_NEXT[role];
  const initials  = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await api.logout().catch(() => undefined);
    onLogout();
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password"); return; }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters"); return; }
    setPwBusy(true);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="dash-wrap">

      <div className="dash-bg" />

      <nav className="dash-nav">
        <a href="/" aria-label="Tokans home" className="site-header-logo"><Wordmark size={22} /></a>
        <div className="dash-nav-right">
          <button
            type="button"
            onClick={onChangeProfile}
            className="dash-role-pill dash-role-pill--btn"
            title="Change profile"
          >
            {roleLabel.toUpperCase()} ✎
          </button>

          {/* Profile dropdown */}
          <div className="dash-profile-wrap" ref={dropRef}>
            <button
              type="button"
              className="dash-profile-btn"
              onClick={() => setDropOpen((o) => !o)}
              aria-expanded={dropOpen}
              aria-haspopup="true"
            >
              <span className="dash-avatar">{initials}</span>
              <span className="dash-profile-name">{user.name ?? user.email}</span>
              <span className="dash-profile-caret" aria-hidden="true">▾</span>
            </button>
            {dropOpen && (
              <div className="dash-dropdown" role="menu">
                <div className="dash-dropdown-user">
                  <div className="dash-dropdown-name">{user.name ?? ""}</div>
                  <div className="dash-dropdown-email">{user.email}</div>
                </div>
                <div className="dash-dropdown-divider" />
                <button
                  type="button"
                  className="dash-dropdown-item"
                  role="menuitem"
                  onClick={() => { setDropOpen(false); setChangePwOpen(true); setPwSuccess(false); setPwError(""); }}
                >
                  Change password
                </button>
                <div className="dash-dropdown-divider" />
                <button
                  type="button"
                  className="dash-dropdown-item dash-dropdown-item--danger"
                  role="menuitem"
                  onClick={() => { setDropOpen(false); void handleLogout(); }}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Change-password modal */}
      {changePwOpen && (
        <div className="dash-modal-overlay" onClick={() => setChangePwOpen(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-title">Change password</div>
            {pwSuccess ? (
              <>
                <div className="dash-modal-success">Password updated successfully.</div>
                <button type="button" className="ui-btn ui-btn--primary ui-btn--full" onClick={() => setChangePwOpen(false)}>Done</button>
              </>
            ) : (
              <>
                <div className="dash-modal-field">
                  <label className="ui-field-label">Current password</label>
                  <input
                    className="ui-input"
                    type="password"
                    placeholder="Your current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="dash-modal-field">
                  <label className="ui-field-label">New password</label>
                  <input
                    className="ui-input"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {pwError && <div className="dash-modal-error">{pwError}</div>}
                <div className="dash-modal-actions">
                  <button type="button" className="ui-btn ui-btn--outline" onClick={() => setChangePwOpen(false)} disabled={pwBusy}>Cancel</button>
                  <button type="button" className="ui-btn ui-btn--primary" onClick={() => void handleChangePassword()} disabled={pwBusy}>
                    {pwBusy ? "Updating…" : "Update password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="dash-main">

        <div className="dash-badge">
          <span className="dash-badge-dot" />
          DASHBOARD COMING SOON
        </div>

        <h1 className="dash-title">
          Welcome, {firstName}.
        </h1>

        <p className="dash-lead">
          We're building your full dashboard. Your profile and Tokan score are already being set up in the background.
        </p>

        <div className="dash-next-card">
          <div className="dash-next-ribbon" />

          <div className="dash-next-eyebrow">
            WHAT'S NEXT FOR YOU
          </div>

          <div className="dash-next-row">
            <div className="dash-next-icon">
              {next.icon}
            </div>
            <div>
              <div className="dash-next-headline">{next.headline}</div>
              <div className="dash-next-body">{next.body}</div>
            </div>
          </div>

          {role === "opportunity_seeker" && (
            <a
              href="/?flow=tokan-task"
              className="ui-btn ui-btn--primary ui-btn--full u-mt-16"
              style={{ textDecoration: "none", textAlign: "center", display: "block" }}
            >
              Start your First Tokan Task →
            </a>
          )}

          <div className="dash-divider" />

          {role === "employer" && <EmployerBriefSection />}

          <div className="dash-divider" />

          <div className="dash-stats">
            {PLACEHOLDER_STATS.map((s) => (
              <div key={s.label} className="dash-stat">
                <div className="dash-stat-val">{s.val}</div>
                <div className="dash-stat-label">{s.label}</div>
                <div className="dash-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="dash-quote">
          "AI needs Tokens. Hum<strong className="dash-quote-em">ans</strong> need Tok<strong className="dash-quote-em">ans</strong>."
        </p>
      </main>
    </div>
  );
}
