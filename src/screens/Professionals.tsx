import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Wordmark, Card, Field, Select, Textarea, BtnPrimary, InfoBox, StepHeader, FadeIn,
} from "../components/ui.js";
import { PROFESSION_GROUPS } from "../data/professions.js";
import type { ProfessionalStatus, SessionPayload } from "../lib/types.js";

const EMPTY: ProfessionalStatus = {
  onboarded: false, profession: null, roleName: null, category: null,
  subType: null, status: "none", subscribed: false, downloadEligible: false,
};

/**
 * Professional onboarding → subscribe → download gate.
 *   1. signup/onboarding: profile your profession → Partner role assigned.
 *   2. subscribe: an active subscription unlocks myWorkAssistant + app listing.
 *   3. download: once approved AND subscribed.
 * Reached standalone at /professionals (or ?flow=professionals).
 */
export default function Professionals({
  user, onLogout,
}: {
  user:     SessionPayload;
  onLogout: () => void;
}) {
  const [status,     setStatus]     = useState<ProfessionalStatus | null>(null);
  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [skills,     setSkills]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [err,        setErr]        = useState("");
  const [dlReason,   setDlReason]   = useState("");

  useEffect(() => {
    api.professionalStatus().then(setStatus).catch(() => setStatus({ ...EMPTY }));
  }, []);

  const submit = async () => {
    if (!profession) return;
    setSaving(true); setErr("");
    try {
      const next = await api.professionalOnboard({
        profession,
        answers: { experience: experience.trim(), skills: skills.trim() },
      });
      setStatus(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSaving(false); }
  };

  const subscribe = async () => {
    setSubscribing(true); setErr("");
    try {
      const { url } = await api.subscribe();
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the subscription");
      setSubscribing(false);
    }
  };

  const download = async () => {
    setDlReason("");
    try {
      const grant = await api.professionalDownload();
      if (grant.eligible && grant.url) {
        window.open(grant.url, "_blank", "noopener,noreferrer");
      } else {
        setDlReason(grant.reason ?? "Download is not available yet.");
      }
    } catch (e) {
      setDlReason(e instanceof Error ? e.message : "Could not start download");
    }
  };

  const firstName = user.name?.split(" ")[0] ?? "there";

  // ── View selection ───────────────────────────────────────────────────────
  const view: "loading" | "form" | "subscribe" | "download" =
    status === null ? "loading"
    : status.downloadEligible ? "download"
    : status.onboarded && status.status === "approved" ? "subscribe"
    : "form";

  return (
    <div className="onboard-page">
      <div className="onboard-nav-row">
        <Wordmark />
        <button type="button" onClick={onLogout} className="onboard-text-btn">Sign out</button>
      </div>

      <Card maxWidth={480}>
        {view === "loading" && <StepHeader title="Loading…" />}

        {view === "download" && status && (
          <FadeIn k="download">
            <StepHeader
              eyebrow="PROFESSIONAL ACCESS"
              title={`You're all set, ${firstName}`}
              sub="Your subscription is active. Download myWorkAssistant to start receiving work."
            />
            <InfoBox variant="success" className="u-mt-16">
              Role: <strong>{status.roleName}</strong> · {status.category} · subscribed
            </InfoBox>
            <BtnPrimary className="u-mt-24" onClick={() => void download()}>
              Download myWorkAssistant →
            </BtnPrimary>
            {dlReason && <InfoBox variant="error" className="u-mt-16">{dlReason}</InfoBox>}
          </FadeIn>
        )}

        {view === "subscribe" && (
          <FadeIn k="subscribe">
            <StepHeader
              eyebrow="ONE MORE STEP"
              title="Subscribe to unlock access"
              sub="Your professional profile is approved. A subscription unlocks the myWorkAssistant desktop app and app-listing features."
            />
            <InfoBox variant="gold" className="u-mt-16">
              Professional — ₹499/month. Cancel anytime.
            </InfoBox>
            {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}
            <BtnPrimary className="u-mt-24" onClick={() => void subscribe()} disabled={subscribing}>
              {subscribing ? "Redirecting…" : "Subscribe →"}
            </BtnPrimary>
          </FadeIn>
        )}

        {view === "form" && status && (
          <FadeIn k="form">
            <StepHeader
              eyebrow="PROFESSIONAL ONBOARDING"
              title="Tell us what you do"
              sub="Your profession shapes the role you're given and the features that open up in myWorkAssistant."
            />

            <Field label="Profession" className="u-mt-16">
              <Select
                title="Profession"
                value={profession}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setProfession(e.target.value)}
              >
                <option value="">Select your profession…</option>
                {PROFESSION_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <Field label="Years of experience" hint="Optional">
              <Textarea
                placeholder="e.g. 6 years building web apps"
                value={experience}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setExperience(e.target.value)}
                maxLength={120}
                minHeight={48}
              />
            </Field>

            <Field label="Primary skills" hint="Optional — comma separated">
              <Textarea
                placeholder="e.g. React, Rust, Postgres, code audits"
                value={skills}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSkills(e.target.value)}
                maxLength={240}
                minHeight={64}
              />
            </Field>

            {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}
            {status.status === "pending" && !err && (
              <InfoBox variant="neutral" className="u-mt-16">
                Your application is pending approval.
              </InfoBox>
            )}

            <BtnPrimary className="u-mt-24" onClick={() => void submit()} disabled={!profession || saving}>
              {saving ? "Saving…" : "Continue →"}
            </BtnPrimary>
          </FadeIn>
        )}
      </Card>
    </div>
  );
}
