import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Wordmark, Card, Field, Select, Textarea, BtnPrimary, InfoBox, StepHeader, FadeIn,
} from "../components/ui.js";
import { PROFESSIONS } from "../data/professions.js";
import type { ProfessionalStatus, SessionPayload } from "../lib/types.js";

/**
 * Professional onboarding + download gate (P0 skeleton).
 * Profile your profession → backend assigns a Partner role → unlock the gated
 * desktop-app download. Reached standalone at `?flow=professionals`.
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
  const [err,        setErr]        = useState("");

  const [dlLoading,  setDlLoading]  = useState(false);
  const [dlReason,   setDlReason]   = useState("");

  // ── Load current professional status on mount ──────────────────────────────
  useEffect(() => {
    api.professionalStatus()
      .then(setStatus)
      .catch(() => setStatus({
        onboarded: false, profession: null, roleName: null, category: null,
        subType: null, status: "none", downloadEligible: false,
      }));
  }, []);

  const submit = async () => {
    if (!profession) return;
    setSaving(true);
    setErr("");
    try {
      const next = await api.professionalOnboard({
        profession,
        answers: { experience: experience.trim(), skills: skills.trim() },
      });
      setStatus(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setDlLoading(true);
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
    } finally {
      setDlLoading(false);
    }
  };

  const firstName = user.name?.split(" ")[0] ?? "there";
  const eligible  = status?.downloadEligible ?? false;

  return (
    <div className="onboard-page">
      <div className="onboard-nav-row">
        <Wordmark />
        <button type="button" onClick={onLogout} className="onboard-text-btn">Sign out</button>
      </div>

      <Card maxWidth={480}>
        {status === null ? (
          <StepHeader title="Loading…" />
        ) : eligible ? (
          // ── Approved → download gate open ──────────────────────────────────
          <FadeIn k="done">
            <StepHeader
              eyebrow="PROFESSIONAL ACCESS"
              title={`You're set up, ${firstName}`}
              sub="Your professional profile is approved. Download myWorkAssistant to start receiving work."
            />
            <InfoBox variant="success" className="u-mt-16">
              Role: <strong>{status.roleName}</strong> · {status.category}
            </InfoBox>
            <BtnPrimary className="u-mt-24" onClick={() => void download()} disabled={dlLoading}>
              {dlLoading ? "Preparing…" : "Download myWorkAssistant →"}
            </BtnPrimary>
            {dlReason && (
              <InfoBox variant="error" className="u-mt-16">{dlReason}</InfoBox>
            )}
          </FadeIn>
        ) : (
          // ── Not yet onboarded → profile form ───────────────────────────────
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
                {PROFESSIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
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
