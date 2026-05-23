import type { RoleId } from "../lib/types.js";

export interface RoleDef {
  id:   RoleId;
  label: string;
  icon:  string;
  desc:  string;
  side:  "Supply" | "Demand" | "Mixed" | "Impact";
}

export interface SubTypeDef {
  id:   string;
  label: string;
  desc:  string;
}

export const ROLES: RoleDef[] = [
  { id: "opportunity_seeker", label: "Opportunity Seeker", icon: "◎", side: "Supply",
    desc: "Looking for my next role, project, or freelance opportunity" },
  { id: "builder",  label: "Builder",       icon: "⬡", side: "Mixed",
    desc: "Building something and need co-founders, collaborators, or technical help" },
  { id: "employer", label: "Employer",       icon: "◈", side: "Demand",
    desc: "A company or startup looking to hire verified, contribution-proven talent" },
  { id: "mentor",   label: "Mentor",         icon: "◉", side: "Supply",
    desc: "Want to guide others and contribute knowledge — earning Mentor Tokans" },
  { id: "donor",    label: "Mission Backer", icon: "◇", side: "Impact",
    desc: "Want to fund access and support professionals navigating the AI transition" },
  { id: "angel",    label: "Angel / Scout",  icon: "◆", side: "Demand",
    desc: "Looking to discover and back early-stage builders or high-Tokan engineers" },
];

export const OPP_SUBTYPES: string[] = [
  "Software Development Engineer (SDE)",
  "Engineering Manager (EM / SDM)",
  "Product Manager",
  "Designer (UI/UX)",
  "Data Scientist / ML Engineer",
  "DevOps / Platform / SRE",
  "QA / SDET",
  "Marketing Professional",
  "Business Analyst",
  "Other",
];

export const BUILDER_SUBTYPES: SubTypeDef[] = [
  { id: "idea_stage",
    label: "Idea / Early Stage",
    desc: "Building something new, looking for a co-founder or collaborator. Equity context, no budget yet." },
  { id: "vibe_founder",
    label: "Product with Traction",
    desc: "V1 is shipped and users exist — I need trusted technical help to take it further. I have a budget." },
];

export const EMPLOYER_SUBTYPES: SubTypeDef[] = [
  { id: "startup_sme", label: "Startup / SME",
    desc: "Actively hiring engineers, PMs, or other technical roles" },
  { id: "enterprise",  label: "Enterprise",
    desc: "Currently invite-only — join the waitlist" },
];

/** Roles that have a sub-type selection step */
export const HAS_SUBTYPE = new Set<RoleId>(["opportunity_seeker", "builder", "employer"]);

/** Roles that have a barrier/what-happens-next explanation step */
export const HAS_BARRIER = new Set<RoleId>(["opportunity_seeker", "builder", "employer"]);

/**
 * Total number of onboarding steps for a given role.
 * Role(1) + [Subtype(1)] + Context(1) + [Barrier(1)]
 */
export function getStepCount(role: RoleId): number {
  return (
    1 +
    (HAS_SUBTYPE.has(role) ? 1 : 0) +
    1 +
    (HAS_BARRIER.has(role) ? 1 : 0)
  );
}
