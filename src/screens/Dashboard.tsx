import { useState } from "react";
import { api } from "../api.js";
import { Wordmark } from "../components/ui.js";
import type { RoleId, SessionPayload } from "../lib/types.js";

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
  user, onLogout,
}: {
  user:     SessionPayload;
  onLogout: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  const role      = (user.role ?? "opportunity_seeker") as RoleId;
  const firstName = user.name?.split(" ")[0] ?? "there";
  const roleLabel = ROLE_LABELS[role];
  const next      = ROLE_NEXT[role];

  const handleLogout = async () => {
    setLoggingOut(true);
    await api.logout().catch(() => undefined);
    onLogout();
  };

  return (
    <div className="dash-wrap">

      <div className="dash-bg" />

      <nav className="dash-nav">
        <a href="/" aria-label="Tokans home" className="site-header-logo"><Wordmark size={22} /></a>
        <div className="dash-nav-right">
          <div className="dash-user">
            {user.name ?? user.email}
          </div>
          <div className="dash-role-pill">
            {roleLabel.toUpperCase()}
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="dash-signout"
          >
            {loggingOut ? "…" : "Sign out"}
          </button>
        </div>
      </nav>

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
