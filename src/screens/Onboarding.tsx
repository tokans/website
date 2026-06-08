import { useState } from "react";
import { api } from "../api.js";
import { Wordmark, Card, BtnPrimary, ProgressBar, FadeIn, InfoBox } from "../components/ui.js";
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

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({
  role, name, onGoToDashboard,
}: {
  role:            RoleId;
  name:            string | null;
  onGoToDashboard: () => void;
}) {
  const items = DONE_NEXT[role];
  return (
    <FadeIn k="done">
      <Card maxWidth={480}>
        <div className="done-tick">✓</div>
        <div className="done-title">
          You're in{name ? `, ${name.split(" ")[0]}` : ""}
        </div>
        <div className="done-body">
          Your account is set up and your profile is being configured.<br />Here's what happens next.
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
  user, onComplete, onLogout, initialRole, entryPath,
}: {
  user:        SessionPayload;
  onComplete:  (session: { authenticated: true; user: SessionPayload }) => void;
  onLogout:    () => void;
  /** Pre-select a role and skip the role picker (e.g. /join → opportunity_seeker, /hire → employer). */
  initialRole?: RoleId;
  /** The path the journey started from (App `flow`). Selects a tailored,
   *  path-specific question set when one is defined in data/journeys.ts. */
  entryPath?:   string;
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
  const [done,         setDone]         = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [serverErr,    setServerErr]    = useState("");

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
        await api.completeOnboarding({ role, subType, context });
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

  if (done && role) {
    return (
      <div className="onboard-page">
        <DoneScreen
          role={role}
          name={user.name}
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
          Not sure? You can always add or change roles after completing onboarding.
        </div>
      )}
    </div>
  );
}
