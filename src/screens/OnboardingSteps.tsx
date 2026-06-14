import type { ChangeEvent } from "react";
import {
  StepHeader, Field, Input, Textarea, Select,
  InfoBox, BarrierBox,
} from "../components/ui.js";
import {
  ROLES, OPP_SUBTYPES, BUILDER_SUBTYPES, EMPLOYER_SUBTYPES, SKILL_LIST,
} from "../data/roles.js";
import type { RoleId } from "../lib/types.js";

// ── Context values shape ──────────────────────────────────────────────────────
export type ContextValues = Record<string, string>;

// ── Shared card primitives ────────────────────────────────────────────────────
function RoleCard({
  role, selected, onSelect,
}: {
  role:     typeof ROLES[number];
  selected: RoleId | null;
  onSelect: (id: RoleId) => void;
}) {
  const s = selected === role.id;
  return (
    <div
      onClick={() => onSelect(role.id)}
      className={`role-card${s ? " is-selected" : ""}`}
    >
      <div className="role-card-side">{role.side}</div>
      <div className="role-card-icon">{role.icon}</div>
      <div className="role-card-label">{role.label}</div>
      <div className="role-card-desc">{role.desc}</div>
    </div>
  );
}

function RadioCard({
  item, selected, onSelect,
}: {
  item:     { id: string; label: string; desc?: string };
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const s = selected === item.id;
  return (
    <div
      onClick={() => onSelect(item.id)}
      className={`radio-card${s ? " is-selected" : ""}`}
    >
      <div>
        <div className="radio-card-label">{item.label}</div>
        {item.desc && <div className="radio-card-desc">{item.desc}</div>}
      </div>
      <div className="radio-card-dot" />
    </div>
  );
}

function Chip({
  label, selected, onSelect,
}: {
  label:    string;
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  const s = selected === label;
  return (
    <div
      onClick={() => onSelect(label)}
      className={`chip${s ? " is-selected" : ""}`}
    >
      {label}
    </div>
  );
}

function MultiSelectChips({
  options, value, onChange, label,
}: {
  options:  string[];
  value:    string;
  onChange: (v: string) => void;
  label?:   string;
}) {
  const selected = new Set(value ? value.split(",").filter(Boolean) : []);
  const toggle = (s: string) => {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange(Array.from(next).join(","));
  };
  return (
    <div>
      {label && <div className="ui-field-label" style={{ marginBottom: 10 }}>{label}</div>}
      <div className="steps-grid-2">
        {options.map((s) => (
          <div
            key={s}
            onClick={() => toggle(s)}
            className={`chip${selected.has(s) ? " is-selected" : ""}`}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 0: Role selection ────────────────────────────────────────────────────
export function RoleStep({
  selected, onSelect,
}: {
  selected: RoleId | null;
  onSelect: (id: RoleId) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="STEP 1 OF ONBOARDING"
        title="What brings you to Tokans?"
        sub="Choose the role that best describes you. You can add more roles later once you meet the requirements for each."
      />
      <div className="steps-grid-3">
        {ROLES.map((r) => (
          <RoleCard key={r.id} role={r} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}

// ── Step 1: Sub-type ──────────────────────────────────────────────────────────
export function SubTypeStep({
  role, selected, onSelect, otherVal, onOtherChange, subType2, onSubType2Change,
}: {
  role:              RoleId;
  selected:          string | null;
  onSelect:          (id: string) => void;
  otherVal:          string;
  onOtherChange:     (v: string) => void;
  subType2?:         string;
  onSubType2Change?: (v: string) => void;
}) {
  if (role === "opportunity_seeker") {
    return (
      <>
        <StepHeader eyebrow="STEP 2 — YOUR PROFILE" title="What's your professional background?" sub="This helps us match you with the right opportunities and calibrate your Tokan categories correctly." />
        <div className="steps-grid-2">
          {OPP_SUBTYPES.map((s) => (
            <Chip key={s} label={s} selected={selected} onSelect={onSelect} />
          ))}
        </div>
        {selected === "Other" && (
          <Field label="Please specify your role" className="u-mt-16">
            <Input
              placeholder="e.g. Solutions Architect, Technical Writer…"
              value={otherVal}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onOtherChange(e.target.value)}
            />
          </Field>
        )}
      </>
    );
  }

  if (role === "builder") {
    return (
      <>
        <StepHeader eyebrow="STEP 2 — YOUR STAGE" title="Where are you in your build?" sub="Your stage determines how the platform routes you — co-founder matching vs. verified technical handoff are very different flows." />
        <div className="steps-col">
          {BUILDER_SUBTYPES.map((s) => (
            <RadioCard key={s.id} item={s} selected={selected} onSelect={onSelect} />
          ))}
        </div>
        {selected === "service_provider_company" && (
          <div className="u-mt-20">
            <MultiSelectChips
              options={SKILL_LIST}
              value={subType2 ?? ""}
              onChange={onSubType2Change ?? (() => undefined)}
              label="What services do you provide?"
            />
          </div>
        )}
      </>
    );
  }

  if (role === "employer") {
    return (
      <>
        <StepHeader eyebrow="STEP 2 — YOUR ORGANISATION" title="What type of organisation are you?" sub="We currently serve startups and SMEs with active hiring needs. Enterprise access is invite-only." />
        <div className="steps-col">
          {EMPLOYER_SUBTYPES.map((s) => (
            <RadioCard key={s.id} item={s} selected={selected} onSelect={onSelect} />
          ))}
        </div>
        {selected === "enterprise" && (
          <InfoBox className="u-mt-16">
            Enterprise access is currently invite-only. We'll add you to the waitlist and reach out when your segment opens.
          </InfoBox>
        )}
      </>
    );
  }

  return null;
}

// ── Step 2: Context questions per role ────────────────────────────────────────
export function ContextStep({
  role, subType, values, onChange,
}: {
  role:     RoleId;
  subType:  string | null;
  values:   ContextValues;
  onChange: (v: ContextValues) => void;
}) {
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...values, [k]: e.target.value });

  if (role === "opportunity_seeker") return (
    <>
      <StepHeader eyebrow="STEP 3 — CONTEXT" title="Tell us what changed" sub="This context shapes your profile and helps employers understand your story — not just your résumé." />
      <Field label="What changed in your last role because of AI?">
        <Textarea placeholder="e.g. Automated testing reduced the QA team by half. My responsibilities shifted but there was no clear path for the evolved role…" value={values["displacement"] ?? ""} onChange={set("displacement")} maxLength={400} minHeight={100} />
      </Field>
      <Field label="What are you looking for next?">
        <Textarea placeholder="e.g. A product-focused engineering role where I can own outcomes end-to-end, or a freelance project while I explore…" value={values["next"] ?? ""} onChange={set("next")} maxLength={300} minHeight={90} />
      </Field>
    </>
  );

  if (role === "builder" && subType === "idea_stage") return (
    <>
      <StepHeader eyebrow="STEP 3 — YOUR BUILD" title="Tell us what you're building" sub="This goes on your builder profile and is shown to potential co-founders. Be specific about the problem and what you've done so far." />
      <Field label="Describe what you're building" hint="Around 100 words is ideal. Co-founders will use this to decide if they want to explore further.">
        <Textarea placeholder="e.g. A marketplace for verified freelance translators in regional Indian languages. Built the prototype in Bolt, have 3 pilot customers…" value={values["buildDesc"] ?? ""} onChange={set("buildDesc")} maxLength={600} minHeight={110} />
      </Field>
      <Field label="Your website / landing page URL OR GitHub repo / Pages URL" hint="For a website we'll email the contact address on the site to confirm you own it; for a GitHub repo or Pages URL we verify ownership via GitHub sign-in.">
        <Input type="url" placeholder="https://yourproject.com  ·  https://github.com/you/app  ·  https://you.github.io/app" value={values["websiteUrl"] ?? ""} onChange={set("websiteUrl")} />
      </Field>
    </>
  );

  if (role === "builder" && subType === "vibe_founder") return (
    <>
      <StepHeader eyebrow="STEP 3 — YOUR PRODUCT" title="Tell us what you need" sub="We'll match you with the right verified professional or service company based on your skill needs." />
      <div className="u-mb-16">
        <MultiSelectChips
          options={SKILL_LIST}
          value={values["bottleneck"] ?? ""}
          onChange={(v) => onChange({ ...values, bottleneck: v })}
          label="What skills do you need to progress forward?"
        />
      </div>
      <Field label="Describe your most pressing problem that needs a solution">
        <Textarea placeholder="e.g. Auth breaks under concurrent users and performance is degrading. I need someone to own the backend architecture…" value={values["problem"] ?? ""} onChange={set("problem")} maxLength={500} minHeight={100} />
      </Field>
      <Field label="Your website / landing page URL OR GitHub repo / Pages URL" hint="For a website we'll email the contact address on the site to confirm you own it; for a GitHub repo or Pages URL we verify ownership via GitHub sign-in.">
        <Input type="url" placeholder="https://yourproduct.com  ·  https://github.com/you/app  ·  https://you.github.io/app" value={values["websiteUrl"] ?? ""} onChange={set("websiteUrl")} />
      </Field>
    </>
  );

  if (role === "builder" && subType === "service_provider_company") return (
    <>
      <StepHeader eyebrow="STEP 3 — YOUR COMPANY" title="Tell us about your services" sub="This helps us verify your company and list you accurately in the Tokans directory." />
      <Field label="Describe the services your company provides" hint="Optional — we can also gather this from your website.">
        <Textarea placeholder="e.g. We provide full-stack engineering teams to early-stage founders on a project or retainer basis…" value={values["description"] ?? ""} onChange={set("description")} maxLength={500} minHeight={100} />
      </Field>
      <Field label="Your company website URL" hint="We'll use your website to verify your company and list your services in the directory.">
        <Input type="url" placeholder="https://yourcompany.com" value={values["websiteUrl"] ?? ""} onChange={set("websiteUrl")} />
      </Field>
    </>
  );

  if (role === "employer") return (
    <>
      <StepHeader eyebrow="STEP 3 — YOUR BRIEF" title="Tell us who you need" sub="We don't show you a browse-and-filter talent pool. We start with your context and send a curated shortlist of up to 5 verified profiles." />
      <InfoBox className="u-mb-20">⏱ This takes about 10 minutes — the friction is intentional and acts as a filter.</InfoBox>
      {(
        [
          ["q1", "1. What does this person need to own — not just do?",          "e.g. Own the entire backend infrastructure — not just write tickets…"],
          ["q2", "2. What does success look like in 60 days?",                   "e.g. The payment system is migrated, API response times under 300ms…"],
          ["q3", "3. What's your current biggest technical bottleneck?",         "e.g. Scaling to 10,000 users and our database queries are not optimised…"],
          ["q4", "4. Have you tried to hire for this before? What happened?",    "e.g. Interviewed 12 people from Naukri. 3 passed technical but couldn't handle ambiguity…"],
        ] as [string, string, string][]
      ).map(([k, label, placeholder]) => (
        <Field key={k} label={label} hint={k === "q4" ? "You'll complete questions 5–7 after account setup — tech setup, engagement type, and budget." : undefined}>
          <Textarea placeholder={placeholder} value={values[k] ?? ""} onChange={set(k)} maxLength={400} minHeight={88} />
        </Field>
      ))}
    </>
  );

  if (role === "mentor") return (
    <>
      <StepHeader eyebrow="STEP 3 — ELIGIBILITY" title="Mentor access has a threshold" sub="The Mentor role is earned, not self-declared. Here's how it works." />
      <BarrierBox title="STANDARD PATH">Minimum <strong className="em-text">500 Tokans</strong> with at least <strong className="em-text">20% in Build or Work categories</strong>. This ensures mentors have demonstrated real, verified contribution.</BarrierBox>
      <BarrierBox title="ALTERNATE PATH">Peer nomination from <strong className="em-text">2 or more existing users</strong>. If you have a strong track record, your peers can nominate you directly — bypassing the threshold.</BarrierBox>
      <Field label="Are you already a Tokans user with an existing score?">
        <Select title="Are you already a Tokans user with an existing score?" value={values["existingUser"] ?? ""} onChange={set("existingUser")}>
          <option value="">Select…</option>
          <option value="yes">Yes — I have an existing Tokan score</option>
          <option value="no">No — I'm new to Tokans</option>
          <option value="nominated">I've been nominated by existing users</option>
        </Select>
      </Field>
      {values["existingUser"] === "no" && (
        <InfoBox>You'll start as an Opportunity Seeker and earn Tokans through real contributions. Once you reach the 500 Tokan threshold, the Mentor role unlocks automatically.</InfoBox>
      )}
    </>
  );

  if (role === "donor") return (
    <>
      <StepHeader eyebrow="STEP 3 — ABOUT YOU" title="Why do you want to back this?" sub="Mission Backers are visible, accountable contributors — not anonymous donors. Your identity is verified before any sponsorship is activated." />
      <Field label="Why do you want to support the Tokans community?">
        <Textarea placeholder="e.g. I've benefited from strong professional networks my whole career and want to pay that forward…" value={values["whyDonate"] ?? ""} onChange={set("whyDonate")} maxLength={400} minHeight={100} />
      </Field>
      <BarrierBox title="VERIFICATION REQUIREMENTS" steps={[
        "Identity verification via government ID (processed securely after signup)",
        "Minimum sponsorship of ₹5,000 — prevents noise and signals genuine intent",
        "You control who you sponsor and receive anonymised impact reports",
      ]} />
    </>
  );

  if (role === "angel") return (
    <>
      <StepHeader eyebrow="STEP 3 — YOUR FOCUS" title="Tell us about your investment focus" sub="Angel and Scout access is gated by identity verification. This keeps Builder profiles protected and interactions high-signal." />
      <Field label="LinkedIn or AngelList profile URL" hint="Used for identity verification only — not displayed publicly without your permission.">
        <Input type="url" placeholder="https://linkedin.com/in/yourprofile" value={values["investorUrl"] ?? ""} onChange={set("investorUrl")} />
      </Field>
      <Field label="What are you typically looking to back?">
        <Textarea placeholder="e.g. Early-stage B2B SaaS with strong technical founders. Interested in infra and dev tools. Typical ticket size ₹5L–25L…" value={values["investmentFocus"] ?? ""} onChange={set("investmentFocus")} maxLength={400} minHeight={100} />
      </Field>
    </>
  );

  return null;
}

// ── Step 3: Barrier / what happens next ──────────────────────────────────────
export function BarrierStep({
  role, subType,
}: {
  role:    RoleId;
  subType: string | null;
}) {
  if (role === "opportunity_seeker") return (
    <>
      <StepHeader eyebrow="STEP 4 — YOUR FIRST CONTRIBUTION" title="Earn your first Tokan in under 10 minutes" sub="Before your profile is visible to employers, you complete one structured peer review — your first contribution to the network." />
      <BarrierBox title="THE FIRST TOKAN TASK" steps={[
        "You're shown an anonymised engineer profile — a real person also looking for opportunity",
        "You answer 5 structured questions: strongest skill, unverifiable claims, would you work with them, what's missing, your confidence in this review",
        "Takes 7–9 minutes. Your answers are scored and become part of your Reviewer Quality Score (RQS)",
        "After submission, your profile opens and you choose your next path",
      ]} />
      <InfoBox variant="success">
        <strong className="em-success">Why this matters:</strong> You're helping another professional be seen more clearly — and starting to build your own verifiable record of what you actually know.
      </InfoBox>
    </>
  );

  if (role === "builder" && subType === "idea_stage") return (
    <>
      <StepHeader eyebrow="STEP 4 — WEBSITE VERIFICATION" title="We'll confirm you own your site" sub="Before your co-founder brief is visible, we verify that you control the website you listed. This prevents vague posts with no skin in the game." />
      <BarrierBox title="HOW VERIFICATION WORKS" steps={[
        "We scrape the contact email from your site — footer, contact page, or WHOIS lookup",
        "We send a one-click verification email to that address",
        "You click confirm — your Builder profile and co-founder brief go live",
        "No contact found? Your profile goes to manual review — flagged, not auto-rejected",
      ]} />
      <InfoBox>No website yet? You can complete setup and add your URL later before your brief goes live.</InfoBox>
    </>
  );

  if (role === "builder" && subType === "vibe_founder") return (
    <>
      <StepHeader eyebrow="STEP 4 — WHAT HAPPENS NEXT" title="We will match your ask with available partners" sub="We don't match you to a pool and let you browse. We assess your needs first — then match you to exactly the right person or team." />
      <BarrierBox title="THE MATCH PROCESS" steps={[
        "Our team reviews your submission and skill needs — within 48 hours",
        "We match you with a verified professional or service company from our directory based on your bottleneck",
        "You're introduced directly — no unsolicited contact, mutual interest only",
        "Engagement is outcome-based. We take 15% on delivery, no upfront cost",
      ]} />
    </>
  );

  if (role === "builder" && subType === "service_provider_company") return (
    <>
      <StepHeader eyebrow="STEP 4 — WHAT HAPPENS NEXT" title="Your services will be listed in the directory" sub="Once your company website is verified, your profile is added to the Tokans service directory." />
      <BarrierBox title="HOW IT WORKS" steps={[
        "We verify your company website — this is the gate to being listed",
        "Your company profile and listed services go live in the Tokans directory",
        "Builders searching for your skills can find and contact your company directly",
        "You control which engagements you accept — no commitments until you agree",
      ]} />
    </>
  );

  if (role === "employer") return (
    <>
      <StepHeader eyebrow="STEP 4 — HOW MATCHING WORKS" title="No browse. No filter. A curated shortlist." sub="We take your brief and send you up to 5 pre-screened, contribution-verified profiles. Here's what to expect." />
      <BarrierBox title="THE MATCH PROCESS" steps={[
        "Your brief is reviewed within 24 hours — we may follow up with a 20-minute calibration call",
        "You receive a shortlist of up to 5 Tokan-verified profiles — names hidden until mutual interest",
        "Express interest in up to 3 simultaneously. Candidates who reciprocate unlock full contact",
        "Every rejection requires a structured reason — it feeds our scoring engine and improves future matches",
      ]} />
      <InfoBox>After a successful engagement, we ask for a delivery rating and rehire intent. Your feedback directly improves the next match.</InfoBox>
    </>
  );

  return null;
}
