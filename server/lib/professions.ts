/**
 * Profession catalogue + profession → UAM-role mapping (P0).
 *
 * Professionals pick a profession during onboarding; the answer derives the UAM
 * Role (category Partner) the backend assigns, which in turn gates features.
 * Mirrored on the frontend at `src/data/professions.ts`.
 */
import type { RoleCategory } from "./backend/contract.js";

export interface ProfessionDef {
  id: string;
  label: string;
}

export const PROFESSIONS: ProfessionDef[] = [
  // Technology
  { id: "software_engineer",    label: "Software Engineer" },
  { id: "frontend_engineer",    label: "Frontend Engineer" },
  { id: "backend_engineer",     label: "Backend Engineer" },
  { id: "devops_sre",           label: "DevOps / SRE" },
  { id: "data_ml",              label: "Data Scientist / ML Engineer" },
  { id: "qa_sdet",              label: "QA / SDET" },
  { id: "product_manager",      label: "Product Manager" },
  { id: "designer",             label: "Designer (UI/UX)" },
  { id: "tech_writer",          label: "Technical Writer" },
  { id: "consultant",           label: "Technical Consultant" },
  // Legal & Finance
  { id: "chartered_accountant", label: "Chartered Accountant (CA)" },
  { id: "lawyer",               label: "Lawyer / Advocate" },
  { id: "financial_advisor",    label: "Financial Advisor" },
  { id: "tax_consultant",       label: "Tax Consultant" },
  { id: "cs_company_secretary", label: "Company Secretary (CS)" },
  // Health & Medicine
  { id: "doctor",               label: "Doctor / Physician" },
  { id: "dentist",              label: "Dentist" },
  { id: "psychologist",         label: "Psychologist / Therapist" },
  { id: "physiotherapist",      label: "Physiotherapist" },
  { id: "dietician",            label: "Dietician / Nutritionist" },
  // Fitness & Wellness
  { id: "gym_trainer",          label: "Gym Trainer / Personal Trainer" },
  { id: "yoga_instructor",      label: "Yoga Instructor" },
  { id: "life_coach",           label: "Life Coach / Wellness Coach" },
  // Education & Coaching
  { id: "tutor",                label: "Tutor / Academic Coach" },
  { id: "career_coach",         label: "Career Coach" },
  { id: "teacher",              label: "Teacher / Educator" },
  // Creative & Other
  { id: "architect",            label: "Architect" },
  { id: "interior_designer",    label: "Interior Designer" },
  { id: "photographer",         label: "Photographer / Videographer" },
  { id: "other",                label: "Other" },
];

const PROFESSION_IDS = new Set(PROFESSIONS.map((p) => p.id));

export function isKnownProfession(id: string): boolean {
  return PROFESSION_IDS.has(id);
}

export function professionToRole(id: string): {
  roleName: string;
  category: RoleCategory;
} {
  return { roleName: `partner.${id}`, category: "Partner" };
}
