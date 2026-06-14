import { useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Wordmark, Card, BtnPrimary, ProgressBar, FadeIn, InfoBox,
  StepHeader, Field, Input, Textarea, BarrierBox,
} from "../components/ui.js";
import type { Journey } from "../data/journeys.js";
import type { SessionPayload } from "../lib/types.js";
import SiteSetupInstructions from "./SiteSetupInstructions.js";

type Values = Record<string, string>;

/**
 * Data-driven onboarding for a known entry path (see data/journeys.ts).
 * The journey decides the role + the exact question steps, so the experience
 * differs by where the visitor started (/join, /hire, /founders, …).
 */
export default function JourneyFlow({
  journey, user, onComplete, onLogout,
}: {
  journey:    Journey;
  user:       SessionPayload;
  onComplete: (session: { authenticated: true; user: SessionPayload }) => void;
  onLogout:   () => void;
}) {
  const [step,      setStep]      = useState(0);
  const [animKey,   setAnimKey]   = useState(0);
  const [subType,   setSubType]   = useState<string | null>(journey.fixedSubType ?? null);
  const [values,    setValues]    = useState<Values>({});
  const [done,      setDone]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [serverErr, setServerErr] = useState("");

  const total      = journey.steps.length;
  const current    = journey.steps[step]!;
  const isLastStep = step === total - 1;

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const canAdvance = (): boolean => {
    if (current.kind === "choice") return subType !== null;
    if (current.kind === "fields") {
      return current.fields.every((f) => !f.required || !!values[f.key]?.trim());
    }
    return true; // barrier / info
  };

  const advance = async () => {
    if (!canAdvance()) return;
    if (!isLastStep) {
      setAnimKey((k) => k + 1);
      setStep((s) => s + 1);
      return;
    }
    // Final step → persist.
    setSaving(true);
    setServerErr("");
    try {
      await api.completeOnboarding({ role: journey.role, subType, context: values, entryPath: journey.entryPath });
      if (journey.role === "employer") {
        await api.saveEmployerBrief({
          whatTheyOwn:         values["q1"] ?? null,
          successAt60Days:     values["q2"] ?? null,
          technicalBottleneck: values["q3"] ?? null,
          pastHiringAttempts:  values["q4"] ?? null,
        }).catch(() => undefined);
      }
      setDone(true);
    } catch (e) {
      setServerErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const retreat = () => {
    if (step === 0) return;
    setAnimKey((k) => k + 1);
    setStep((s) => s - 1);
  };

  // ── Done ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="onboard-page">
        <FadeIn k="done">
          <Card maxWidth={480}>
            <div className="done-tick">✓</div>
            <div className="done-title">
              You're in{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </div>
            <div className="done-body">
              Your account is set up and your profile is being configured.<br />Here's what happens next.
            </div>
            <div className="done-next">
              <div className="done-next-eyebrow">WHAT HAPPENS NEXT</div>
              {journey.doneNext.map((it, i) => (
                <div key={i} className="done-next-item">
                  <div className="done-next-dot" />
                  <div className="done-next-text"><strong>{it.t}</strong><br />{it.d}</div>
                </div>
              ))}
            </div>
            {journey.role === "builder" && values["websiteUrl"] && (
              <SiteSetupInstructions websiteUrl={values["websiteUrl"]} />
            )}
            <BtnPrimary className="u-mt-24" onClick={() => onComplete({
              authenticated: true,
              user: {
                ...user,
                onboardingComplete: true,
                role: journey.role,
                subType,
                completedJourneys: Array.from(new Set([...(user.completedJourneys ?? []), journey.entryPath])),
              },
            })}>
              Continue →
            </BtnPrimary>
          </Card>
        </FadeIn>
      </div>
    );
  }

  // ── Step body ───────────────────────────────────────────────────────────────
  const cardMaxWidth = current.kind === "fields" && current.fields.length >= 4 ? 600 : 480;

  const body = () => {
    if (current.kind === "choice") {
      return (
        <>
          <StepHeader eyebrow={current.eyebrow} title={current.title} {...(current.sub ? { sub: current.sub } : {})} />
          {current.style === "chips" ? (
            <div className="steps-grid-2">
              {current.options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => setSubType(o.value)}
                  className={`chip${subType === o.value ? " is-selected" : ""}`}
                >
                  {o.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="steps-col">
              {current.options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => setSubType(o.value)}
                  className={`radio-card${subType === o.value ? " is-selected" : ""}`}
                >
                  <div>
                    <div className="radio-card-label">{o.label}</div>
                    {o.desc && <div className="radio-card-desc">{o.desc}</div>}
                  </div>
                  <div className="radio-card-dot" />
                </div>
              ))}
            </div>
          )}
          {current.noteWhen && subType === current.noteWhen.value && (
            <InfoBox className="u-mt-16">{current.noteWhen.text}</InfoBox>
          )}
        </>
      );
    }

    if (current.kind === "fields") {
      return (
        <>
          <StepHeader eyebrow={current.eyebrow} title={current.title} {...(current.sub ? { sub: current.sub } : {})} />
          {current.intro && <InfoBox className="u-mb-20">{current.intro}</InfoBox>}
          {current.fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={set(f.key)}
                  placeholder={f.placeholder ?? ""}
                  {...(f.maxLength ? { maxLength: f.maxLength } : {})}
                  {...(f.minHeight ? { minHeight: f.minHeight } : {})}
                />
              ) : (
                <Input
                  type={f.type === "url" ? "url" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={set(f.key)}
                  placeholder={f.placeholder ?? ""}
                />
              )}
            </Field>
          ))}
        </>
      );
    }

    // barrier
    return (
      <>
        <StepHeader eyebrow={current.eyebrow} title={current.title} {...(current.sub ? { sub: current.sub } : {})} />
        <BarrierBox steps={current.steps} />
        {current.note && (
          <InfoBox variant={current.noteVariant ?? "neutral"}>
            {current.noteVariant === "success" ? <strong className="em-success">Why this matters: </strong> : null}
            {current.note}
          </InfoBox>
        )}
      </>
    );
  };

  const pageCls =
    cardMaxWidth === 600 ? "onboard-page onboard-page--w-600" : "onboard-page";

  return (
    <div className={pageCls}>
      <div className="onboard-nav-row">
        <a href="/" aria-label="Tokans home" className="site-header-logo"><Wordmark /></a>
        <button type="button" onClick={onLogout} className="onboard-text-btn">Sign out</button>
      </div>

      <div className="onboard-progress-wrap">
        <ProgressBar value={step + 1} total={total} label={`STEP ${step + 1} OF ${total}`} />
      </div>

      <Card maxWidth={cardMaxWidth}>
        <FadeIn k={animKey}>{body()}</FadeIn>

        {serverErr && <InfoBox variant="error" className="u-mt-16">{serverErr}</InfoBox>}

        <div className="onboard-actions">
          {step > 0 && (
            <button type="button" onClick={retreat} className="onboard-back-btn">← Back</button>
          )}
          <BtnPrimary onClick={() => void advance()} disabled={!canAdvance() || saving}>
            {saving ? "Saving…" : isLastStep ? journey.finishLabel : "Continue →"}
          </BtnPrimary>
        </div>
      </Card>
    </div>
  );
}
