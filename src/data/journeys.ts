/**
 * Entry-path onboarding journeys.
 *
 * The post-login onboarding adapts to the path the visitor started from
 * (/join, /hire, /founders, …). Each journey pre-selects the role and supplies
 * its OWN ordered question steps, so the questions differ per start point.
 *
 * Paths without a journey here (or a plain /?flow=login) fall back to the
 * generic role-picker engine in Onboarding.tsx.
 */
import { OPP_SUBTYPES, EMPLOYER_SUBTYPES } from "./roles.js";
import type { RoleId, SubType } from "../lib/types.js";

export type FieldType = "text" | "url" | "textarea";

export interface JourneyField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  minHeight?: number;
}

export interface ChoiceOption {
  value: string;
  label: string;
  desc?: string;
}

/** One step in a journey. Three kinds cover every existing onboarding screen. */
export type JourneyStep =
  | {
      kind: "fields";
      eyebrow: string;
      title: string;
      sub?: string;
      intro?: string; // optional InfoBox shown above the fields
      fields: JourneyField[];
    }
  | {
      kind: "choice";
      eyebrow: string;
      title: string;
      sub?: string;
      /** Stored as the onboarding subType. */
      key: "subType";
      style: "chips" | "radio";
      options: ChoiceOption[];
      /** Optional note shown when a specific option is selected. */
      noteWhen?: { value: string; text: string };
    }
  | {
      kind: "barrier";
      eyebrow: string;
      title: string;
      sub?: string;
      steps: string[];
      note?: string;
      noteVariant?: "success" | "neutral" | "gold";
    };

export interface Journey {
  /** Entry-path key (App `flow`). */
  entryPath: string;
  role: RoleId;
  /** Fixed subType when the journey has no choice step (e.g. founders). */
  fixedSubType?: SubType | null;
  steps: JourneyStep[];
  doneNext: { t: string; d: string }[];
  finishLabel: string;
}

const oppChoices: ChoiceOption[] = OPP_SUBTYPES.map((s) => ({ value: s, label: s }));
const employerChoices: ChoiceOption[] = EMPLOYER_SUBTYPES.map((s) => ({
  value: s.id,
  label: s.label,
  desc: s.desc,
}));

// ── /join → Opportunity Seeker ────────────────────────────────────────────────
const JOIN: Journey = {
  entryPath: "join",
  role: "opportunity_seeker",
  finishLabel: "Start my First Tokan Task →",
  steps: [
    {
      kind: "choice",
      key: "subType",
      style: "chips",
      eyebrow: "YOUR PROFILE",
      title: "What's your professional background?",
      sub: "This helps us match you with the right opportunities and calibrate your Tokan categories correctly.",
      options: oppChoices,
    },
    {
      kind: "fields",
      eyebrow: "CONTEXT",
      title: "Tell us what changed",
      sub: "This context shapes your profile and helps employers understand your story — not just your résumé.",
      fields: [
        {
          key: "displacement",
          label: "What changed in your last role because of AI?",
          type: "textarea",
          placeholder: "e.g. Automated testing reduced the QA team by half. My responsibilities shifted but there was no clear path for the evolved role…",
          required: true, maxLength: 400, minHeight: 100,
        },
        {
          key: "next",
          label: "What are you looking for next?",
          type: "textarea",
          placeholder: "e.g. A product-focused engineering role where I can own outcomes end-to-end, or a freelance project while I explore…",
          required: true, maxLength: 300, minHeight: 90,
        },
      ],
    },
    {
      kind: "barrier",
      eyebrow: "YOUR FIRST CONTRIBUTION",
      title: "Earn your first Tokan in under 10 minutes",
      sub: "Before your profile is visible to employers, you complete one structured peer review — your first contribution to the network.",
      steps: [
        "You're shown an anonymised engineer profile — a real person also looking for opportunity",
        "You answer 5 structured questions: strongest skill, unverifiable claims, would you work with them, what's missing, your confidence in this review",
        "Takes 7–9 minutes. Your answers are scored and become part of your Reviewer Quality Score (RQS)",
        "After submission, your profile opens and you choose your next path",
      ],
      note: "You're helping another professional be seen more clearly — and starting to build your own verifiable record of what you actually know.",
      noteVariant: "success",
    },
  ],
  doneNext: [
    { t: "Complete your First Tokan Task", d: "An anonymised profile is waiting for your peer review. ~8 minutes." },
    { t: "Your profile goes live", d: "After submission, choose your next path — get reviewed, take a skill assessment, or join a live brief." },
    { t: "Earn Tokans, gain visibility", d: "Every verified contribution adds to your score. High Tokan profiles surface first in employer shortlists." },
  ],
};

// ── /hire → Employer ──────────────────────────────────────────────────────────
const HIRE: Journey = {
  entryPath: "hire",
  role: "employer",
  finishLabel: "Complete setup →",
  steps: [
    {
      kind: "choice",
      key: "subType",
      style: "radio",
      eyebrow: "YOUR ORGANISATION",
      title: "What type of organisation are you?",
      sub: "We currently serve startups and SMEs with active hiring needs. Enterprise access is invite-only.",
      options: employerChoices,
      noteWhen: { value: "enterprise", text: "Enterprise access is currently invite-only. We'll add you to the waitlist and reach out when your segment opens." },
    },
    {
      kind: "fields",
      eyebrow: "YOUR BRIEF",
      title: "Tell us who you need",
      sub: "We don't show you a browse-and-filter talent pool. We start with your context and send a curated shortlist of up to 5 verified profiles.",
      intro: "⏱ This takes about 10 minutes — the friction is intentional and acts as a filter.",
      fields: [
        { key: "q1", label: "1. What does this person need to own — not just do?", type: "textarea", placeholder: "e.g. Own the entire backend infrastructure — not just write tickets…", required: true, maxLength: 400, minHeight: 88 },
        { key: "q2", label: "2. What does success look like in 60 days?", type: "textarea", placeholder: "e.g. The payment system is migrated, API response times under 300ms…", required: true, maxLength: 400, minHeight: 88 },
        { key: "q3", label: "3. What's your current biggest technical bottleneck?", type: "textarea", placeholder: "e.g. Scaling to 10,000 users and our database queries are not optimised…", required: true, maxLength: 400, minHeight: 88 },
        { key: "q4", label: "4. Have you tried to hire for this before? What happened?", type: "textarea", placeholder: "e.g. Interviewed 12 people from Naukri. 3 passed technical but couldn't handle ambiguity…", hint: "You'll complete questions 5–7 after account setup — tech setup, engagement type, and budget.", required: true, maxLength: 400, minHeight: 88 },
      ],
    },
    {
      kind: "barrier",
      eyebrow: "HOW MATCHING WORKS",
      title: "No browse. No filter. A curated shortlist.",
      sub: "We take your brief and send you up to 5 pre-screened, contribution-verified profiles. Here's what to expect.",
      steps: [
        "Your brief is reviewed within 24 hours — we may follow up with a 20-minute calibration call",
        "You receive a shortlist of up to 5 Tokan-verified profiles — names hidden until mutual interest",
        "Express interest in up to 3 simultaneously. Candidates who reciprocate unlock full contact",
        "Every rejection requires a structured reason — it feeds our scoring engine and improves future matches",
      ],
      note: "After a successful engagement, we ask for a delivery rating and rehire intent. Your feedback directly improves the next match.",
      noteVariant: "neutral",
    },
  ],
  doneNext: [
    { t: "Brief review in 24 hours", d: "Our team will review your answers and may follow up for a 20-minute calibration call." },
    { t: "Shortlist delivered", d: "Up to 5 verified profiles matched to your brief. Names hidden until mutual interest." },
    { t: "Complete questions 5–7", d: "Your dashboard has the remaining brief questions on tech setup, engagement type, and budget." },
  ],
};

// /founders is handled by the Generic engine (Onboarding.tsx) with initialRole="builder".
// It records entryPath="founders" in user_journeys and lets the user pick their builder sub-type.

const JOURNEYS: Record<string, Journey> = {
  join: JOIN,
  hire: HIRE,
};

/** Resolve the journey for an entry path, if one is defined. */
export function getJourney(entryPath: string | undefined): Journey | undefined {
  if (!entryPath) return undefined;
  return JOURNEYS[entryPath];
}
