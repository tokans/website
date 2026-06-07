import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Card, Field, Input, Textarea, Select, BtnPrimary, InfoBox, StepHeader, FadeIn,
} from "../components/ui.js";
import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";
import type { SeedProfile, SessionPayload, TokanTaskAnswers } from "../lib/types.js";

const EMPTY_ANSWERS: TokanTaskAnswers = {
  strongestSkill: "", unverifiableClaim: "", wouldWorkWith: "", missing: "", confidence: "medium",
};

/**
 * First Tokan Task — review an anonymised seed profile, answer 5 questions, earn
 * the first Tokan. The supply-side "aha" reached after /join onboarding (or from
 * the dashboard via /?flow=tokan-task).
 */
export default function FirstTokanTask({
  user, onDone,
}: {
  user:   SessionPayload;
  onDone: () => void;
}) {
  const [profile, setProfile] = useState<SeedProfile | null | undefined>(undefined); // undefined = loading
  const [a,       setA]       = useState<TokanTaskAnswers>(EMPTY_ANSWERS);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  useEffect(() => {
    api.getTokanTask().then((r) => setProfile(r.profile)).catch(() => setProfile(null));
  }, []);

  const submit = async () => {
    if (!profile || !a.strongestSkill.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await api.submitTokanTask({ seedProfileId: profile.id, answers: a });
      setDoneMsg(r.tokanAwarded ? "You earned your first Tokan!" : "Review recorded.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit your review");
    } finally { setBusy(false); }
  };

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <PageLayout content={PAGE_CONTEXTS["tokan-task"]!}>
      <Card maxWidth={720}>
        {profile === undefined ? (
          <StepHeader title="Loading…" />
        ) : doneMsg ? (
          <FadeIn k="done">
            <div className="done-tick">✓</div>
            <StepHeader title={doneMsg} sub="Your profile is going live. Keep contributing to grow your Tokan score." />
            <BtnPrimary className="u-mt-24" onClick={onDone}>Go to my dashboard →</BtnPrimary>
          </FadeIn>
        ) : profile === null ? (
          <FadeIn k="empty">
            <StepHeader title={`Nice work, ${firstName}`} sub="You've reviewed all the profiles available right now." />
            <BtnPrimary className="u-mt-24" onClick={onDone}>Go to my dashboard →</BtnPrimary>
          </FadeIn>
        ) : (
          <FadeIn k="task">
            <StepHeader
              title="Review this profile"
              sub="Read it carefully, then answer 5 short questions (~8 min). You're helping another engineer be seen clearly — and starting your own record."
            />

            <div className="ui-barrier u-mt-16">
              <strong>{profile.headline}</strong>
              <div className="ui-field-hint">{profile.skills.join(" · ")}</div>
              <div className="ui-barrier-text" style={{ marginTop: 8 }}>{profile.summary}</div>
              <ul className="ui-barrier-list">
                {profile.claims.map((c, i) => (
                  <li key={i} className="ui-barrier-item"><span className="ui-barrier-num">{i + 1}</span>{c}</li>
                ))}
              </ul>
            </div>

            <Field label="Their strongest demonstrated skill" className="u-mt-16">
              <Input value={a.strongestSkill}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setA({ ...a, strongestSkill: e.target.value })}
                placeholder="What stands out most?" />
            </Field>
            <Field label="A claim you can't verify here">
              <Textarea value={a.unverifiableClaim}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setA({ ...a, unverifiableClaim: e.target.value })}
                maxLength={240} minHeight={48} />
            </Field>
            <Field label="Would you work with them on a project? Why?">
              <Textarea value={a.wouldWorkWith}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setA({ ...a, wouldWorkWith: e.target.value })}
                maxLength={240} minHeight={48} />
            </Field>
            <Field label="One thing missing from this profile">
              <Textarea value={a.missing}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setA({ ...a, missing: e.target.value })}
                maxLength={240} minHeight={48} />
            </Field>
            <Field label="Your confidence in this review">
              <Select title="Confidence" value={a.confidence}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setA({ ...a, confidence: e.target.value as TokanTaskAnswers["confidence"] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>

            {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}

            <BtnPrimary className="u-mt-24" onClick={() => void submit()} disabled={!a.strongestSkill.trim() || busy}>
              {busy ? "Submitting…" : "Submit review →"}
            </BtnPrimary>
          </FadeIn>
        )}
      </Card>
    </PageLayout>
  );
}
