import { useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import { Wordmark, Card, BtnPrimary, ProgressBar, FadeIn, InfoBox, Field, Input } from "../components/ui.js";
import { RoleStep, SubTypeStep, ContextStep, BarrierStep, type ContextValues } from "./OnboardingSteps.js";
import JourneyFlow from "./JourneyFlow.js";
import { HAS_SUBTYPE, HAS_BARRIER, getStepCount } from "../data/roles.js";
import { getJourney } from "../data/journeys.js";
import type { RoleId, SessionPayload } from "../lib/types.js";

// ── What-happens-next items per role ─────────────────────────────────────────
const DONE_NEXT: Record<RoleId, { t: string; d: string }[]> = {
  opportunity_seeker: [
    { t: "Complete your First Tokan Task", d: "An anonymised profile is waiting for your peer review. ~8 minutes." },
    { t: "Your profile goes live", d: "After submission, choose your next path — get reviewed, take a skill assessment, or join a live brief." },
    { t: "Earn Tokans, gain visibility", d: "Every verified contribution adds to your score. High Tokan profiles surface first in employer shortlists." },
  ],
  builder: [
    { t: "Verification email on its way", d: "Check the inbox connected to your website contact address and click confirm." },
    { t: "Your Builder profile goes live", d: "Once verified, your co-founder brief is visible to other Builders and Angel Scouts." },
    { t: "Mutual interest only", d: "Co-founders can see your brief and express interest. You'll be notified — no unsolicited contact." },
  ],
  employer: [
    { t: "Brief review in 24 hours", d: "Our team will review your answers and may follow up for a 20-minute calibration call." },
    { t: "Shortlist delivered", d: "Up to 5 verified profiles matched to your brief. Names hidden until mutual interest." },
    { t: "Complete questions 5–7", d: "Your dashboard has the remaining brief questions on tech setup, engagement type, and budget." },
  ],
  mentor: [
    { t: "Start earning Tokans", d: "Begin as an Opportunity Seeker — every contribution builds toward the 500 Tokan threshold." },
    { t: "Mentor role unlocks automatically", d: "When you hit 500 Tokans with 20%+ in Build/Work, the Mentor role is offered to you." },
    { t: "Or get nominated", d: "Two or more existing users can nominate you directly — bypassing the threshold." },
  ],
  donor: [
    { t: "Identity verification next", d: "You'll receive an email with the verification steps — takes about 5 minutes." },
    { t: "Choose who to sponsor", d: "Once verified, sponsor a specific user's onboarding costs or contribute to the general fund." },
    { t: "Impact reports quarterly", d: "Anonymised reports showing how your sponsorship is being used." },
  ],
  angel: [
    { t: "Profile verification underway", d: "We'll verify your LinkedIn or AngelList profile within 48 hours." },
    { t: "Access to Builder profiles", d: "Once verified, browse Builder profiles and co-founder briefs — read-only until you express interest." },
    { t: "Post your Scout Brief", d: "Let Builders come to you — describe what you back and they approach you directly." },
  ],
};

// ── GitHub connect prompt (GitHub URL but no GitHub OAuth yet) ────────────────
function NeedsGithubAuthStep({ projectUrl }: { projectUrl: string }) {
  return (
    <FadeIn k="github-auth">
      <Card maxWidth={480}>
        <div className="ui-step-header">
          <div className="ui-step-eyebrow">WEBSITE VERIFICATION</div>
          <div className="ui-step-title">Connect GitHub to verify your project</div>
          <div className="ui-step-sub">
            You provided a GitHub project URL. Sign in with GitHub and we'll automatically
            confirm you own <strong>{projectUrl}</strong> — no email needed.
          </div>
        </div>
        <BtnPrimary
          className="u-mt-24"
          onClick={() => { window.location.href = "/api/auth/github"; }}
        >
          Continue with GitHub →
        </BtnPrimary>
        <div style={{ marginTop: "12px", textAlign: "center", fontSize: "13px", color: "var(--color-muted, #888)" }}>
          Already connected? <a href="/app" style={{ color: "inherit", textDecoration: "underline" }}>Go to dashboard</a>
        </div>
      </Card>
    </FadeIn>
  );
}

// ── Website email input (when scraper found no mailto:) ───────────────────────
function WebsiteEmailStep({
  domain,
  onSent,
}: {
  domain: string;
  onSent: (email: string) => void;
}) {
  const [email,   setEmail]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const emailDomain = email.split("@")[1]?.toLowerCase().replace(/^www\./, "") ?? "";
  const valid = email.includes("@") && emailDomain === domain;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr("");
    try {
      await api.sendVerifyEmail(email);
      onSent(email);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <FadeIn k="email-input">
      <Card maxWidth={480}>
        <div className="ui-step-header">
          <div className="ui-step-eyebrow">WEBSITE VERIFICATION</div>
          <div className="ui-step-title">Enter your contact email</div>
          <div className="ui-step-sub">
            We couldn't find a <code>mailto:</code> link on your site. Enter an email address at{" "}
            <strong>@{domain}</strong> so we can confirm you own it.
          </div>
        </div>
        <Field label={`Contact email at @${domain}`} hint={`Must end with @${domain}`}>
          <Input
            type="email"
            placeholder={`you@${domain}`}
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value.trim())}
          />
        </Field>
        {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}
        <div className="onboard-actions">
          <BtnPrimary onClick={() => void submit()} disabled={!valid || saving}>
            {saving ? "Sending…" : "Send verification email →"}
          </BtnPrimary>
        </div>
      </Card>
    </FadeIn>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({
  role, name, doneNextItems, onGoToDashboard, reOnboarding,
}: {
  role:            RoleId;
  name:            string | null;
  doneNextItems?:  { t: string; d: string }[];
  onGoToDashboard: () => void;
  reOnboarding?:   boolean;
}) {
  const items = doneNextItems ?? DONE_NEXT[role];
  return (
    <FadeIn k="done">
      <Card maxWidth={480}>
        <div className="done-tick">✓</div>
        <div className="done-title">
          {reOnboarding
            ? `Profile updated${name ? `, ${name.split(" ")[0]}` : ""}`
            : `You're in${name ? `, ${name.split(" ")[0]}` : ""}`
          }
        </div>
        <div className="done-body">
          {reOnboarding
            ? "Your profile has been updated. Here's what happens next with your new role."
            : <>Your account is set up and your profile is being configured.<br />Here's what happens next.</>
          }
        </div>
        <div className="done-next">
          <div className="done-next-eyebrow">WHAT HAPPENS NEXT</div>
          {items.map((it, i) => (
            <div key={i} className="done-next-item">
              <div className="done-next-dot" />
              <div className="done-next-text">
                <strong>{it.t}</strong><br />{it.d}
              </div>
            </div>
          ))}
        </div>
        <BtnPrimary className="u-mt-24" onClick={onGoToDashboard}>
          Go to my dashboard →
        </BtnPrimary>
      </Card>
    </FadeIn>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export default function Onboarding({
  user, onComplete, onLogout, initialRole, entryPath, reOnboarding,
}: {
  user:        SessionPayload;
  onComplete:  (session: { authenticated: true; user: SessionPayload }) => void;
  onLogout:    () => void;
  /** Pre-select a role and skip the role picker (e.g. /join → opportunity_seeker, /hire → employer). */
  initialRole?: RoleId;
  /** The path the journey started from (App `flow`). Selects a tailored,
   *  path-specific question set when one is defined in data/journeys.ts. */
  entryPath?:   string;
  /** true when the user is changing their profile after initial onboarding. */
  reOnboarding?: boolean;
}) {
  // Entry-path journeys (e.g. /join, /hire, /founders) drive their own,
  // path-specific questions. Everything else uses the generic role picker below.
  const journey = getJourney(entryPath);
  if (journey) {
    return (
      <JourneyFlow
        journey={journey}
        user={user}
        onComplete={onComplete}
        onLogout={onLogout}
      />
    );
  }

  const minStep = initialRole ? 1 : 0;
  const [role,         setRole]         = useState<RoleId | null>(initialRole ?? null);
  const [subType,      setSubType]      = useState<string | null>(null);
  const [otherSubType, setOtherSubType] = useState("");
  const [context,      setContext]      = useState<ContextValues>({});
  const [step,         setStep]         = useState(minStep);
  const [animKey,      setAnimKey]      = useState(0);
  const [done,          setDone]          = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [serverErr,     setServerErr]     = useState("");
  // Website verification states (idea_stage builders)
  const [verifyEmailDomain,  setVerifyEmailDomain]  = useState<string | null>(null);
  const [verifyEmailSent,    setVerifyEmailSent]    = useState<string | null>(null);
  const [needsGithubAuth,    setNeedsGithubAuth]    = useState(false);
  const [autoVerified,       setAutoVerified]       = useState(false);

  const totalSteps  = role ? getStepCount(role) : 1;
  const hasSubtype  = role !== null && HAS_SUBTYPE.has(role);
  const hasBarrier  = role !== null && HAS_BARRIER.has(role);
  const contextStep = hasSubtype ? 2 : 1;
  const barrierStep = hasSubtype ? 3 : 2;
  const isLastStep  = step === totalSteps - 1;

  const canAdvance = (): boolean => {
    if (step === 0) return role !== null;
    if (step === 1 && hasSubtype) return subType !== null;
    if (step === contextStep) {
      if (!role) return false;
      if (role === "opportunity_seeker") return !!(context["displacement"]?.trim() && context["next"]?.trim());
      if (role === "builder" && subType === "idea_stage")   return !!context["buildDesc"]?.trim();
      if (role === "builder" && subType === "vibe_founder") return !!(context["stack"]?.trim() && context["bottleneck"]?.trim());
      if (role === "employer")  return !!(context["q1"]?.trim() && context["q2"]?.trim() && context["q3"]?.trim() && context["q4"]?.trim());
      if (role === "mentor")    return !!context["existingUser"];
      if (role === "donor")     return !!context["whyDonate"]?.trim();
      if (role === "angel")     return !!(context["investorUrl"]?.trim() && context["investmentFocus"]?.trim());
      return true;
    }
    return true;
  };

  const advance = async () => {
    if (!canAdvance() || !role) return;
    if (isLastStep) {
      setSaving(true);
      setServerErr("");
      try {
        const result = await api.completeOnboarding({ role, subType, context });
        if (result.autoVerified) {
          // GitHub URL matched their connected account — instant verification.
          setAutoVerified(true);
          setDone(true);
          return;
        }
        if (result.needsGithubAuth) {
          // GitHub project URL but no GitHub login yet — prompt to connect.
          setNeedsGithubAuth(true);
          return;
        }
        if (result.verificationSent === true && result.scrapedEmail) {
          // Email found (scraped or README) and sent — jump to done.
          setVerifyEmailSent(result.scrapedEmail);
          setDone(true);
          return;
        }
        if (result.verificationSent === false && result.emailDomain) {
          // No email found — prompt the user to provide one at the right domain.
          setVerifyEmailDomain(result.emailDomain);
          return;
        }
        if (role === "employer") {
          // /hire: persist the (partial) 7-question brief; questions 5–7 come later.
          await api.saveEmployerBrief({
            whatTheyOwn:         context["q1"] ?? null,
            successAt60Days:     context["q2"] ?? null,
            technicalBottleneck: context["q3"] ?? null,
            pastHiringAttempts:  context["q4"] ?? null,
          }).catch(() => undefined);
        }
        setDone(true);
      } catch (e) {
        setServerErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSaving(false);
      }
      return;
    }
    setAnimKey((k) => k + 1);
    setStep((s) => s + 1);
  };

  const retreat = () => {
    if (step <= minStep) return;
    setAnimKey((k) => k + 1);
    setStep((s) => s - 1);
  };

  const handleRoleSelect = (r: RoleId) => {
    setRole(r);
    setSubType(null);
    setContext({});
  };

  const cardMaxWidth =
    step === 0 ? 680
    : step === contextStep && role === "employer" ? 600
    : 480;

  const renderStep = () => {
    if (step === 0) return <RoleStep key={animKey} selected={role} onSelect={handleRoleSelect} />;
    if (step === 1 && hasSubtype && role) return <SubTypeStep key={animKey} role={role} selected={subType} onSelect={setSubType} otherVal={otherSubType} onOtherChange={setOtherSubType} />;
    if (step === contextStep && role) return <ContextStep key={animKey} role={role} subType={subType} values={context} onChange={setContext} />;
    if (step === barrierStep && hasBarrier && role) return <BarrierStep key={animKey} role={role} subType={subType} />;
    return null;
  };

  const btnLabel = () => {
    if (saving) return "Saving…";
    if (isLastStep) return role === "opportunity_seeker" ? "Start my First Tokan Task →" : "Complete setup →";
    return "Continue →";
  };

  // GitHub connect prompt.
  if (needsGithubAuth && !done) {
    const projectUrl = (context["websiteUrl"] ?? "") as string;
    return (
      <div className="onboard-page">
        <NeedsGithubAuthStep projectUrl={projectUrl} />
      </div>
    );
  }

  // Email input step: scraper found the domain but no email.
  if (verifyEmailDomain && !done) {
    return (
      <div className="onboard-page">
        <WebsiteEmailStep
          domain={verifyEmailDomain}
          onSent={(email) => { setVerifyEmailSent(email); setDone(true); }}
        />
      </div>
    );
  }

  if (done && role) {
    // Override "what happens next" for builders depending on how verification resolved.
    const overriddenItems = autoVerified
      ? DONE_NEXT[role].map((it) =>
          it.t === "Verification email on its way"
            ? { t: "Profile verified via GitHub ✓", d: "Your GitHub account confirmed ownership of the project. Your Builder profile is live." }
            : it
        )
      : verifyEmailSent
      ? DONE_NEXT[role].map((it) =>
          it.t === "Verification email on its way"
            ? { ...it, d: `Sent to ${verifyEmailSent} — click the link to publish your profile.` }
            : it
        )
      : DONE_NEXT[role];

    return (
      <div className="onboard-page">
        <DoneScreen
          role={role}
          name={user.name}
          doneNextItems={overriddenItems}
          {...(reOnboarding ? { reOnboarding } : {})}
          onGoToDashboard={() => onComplete({
            authenticated: true,
            user: { ...user, onboardingComplete: true, role, subType },
          })}
        />
      </div>
    );
  }

  const pageCls =
    cardMaxWidth === 680 ? "onboard-page onboard-page--w-680"
    : cardMaxWidth === 600 ? "onboard-page onboard-page--w-600"
    : "onboard-page";

  return (
    <div className={pageCls}>

      <div className="onboard-nav-row">
        <a href="/" aria-label="Tokans home" className="site-header-logo"><Wordmark /></a>
        <button type="button" onClick={onLogout} className="onboard-text-btn">Sign out</button>
      </div>

      <div className="onboard-progress-wrap">
        <ProgressBar value={step + 1} total={totalSteps} label={`STEP ${step + 1} OF ${totalSteps}`} />
      </div>

      <Card maxWidth={cardMaxWidth}>
        <FadeIn k={animKey}>
          {renderStep()}
        </FadeIn>

        {serverErr && (
          <InfoBox variant="error" className="u-mt-16">
            {serverErr}
          </InfoBox>
        )}

        <div className="onboard-actions">
          {step > minStep && (
            <button type="button" onClick={retreat} className="onboard-back-btn">
              ← Back
            </button>
          )}
          <BtnPrimary onClick={() => void advance()} disabled={!canAdvance() || saving}>
            {btnLabel()}
          </BtnPrimary>
        </div>
      </Card>

      {step === 0 && (
        <div className="onboard-hint">
          {reOnboarding
            ? "Switching roles replaces your current profile. Your Tokan history is preserved."
            : "Not sure? You can always add or change roles after completing onboarding."
          }
        </div>
      )}
    </div>
  );
}
