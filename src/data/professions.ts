// Profession catalogue (frontend mirror of server/lib/professions.ts).
// Keep in sync — the backend validates the id on submit.

export interface ProfessionDef {
  id: string;
  label: string;
}

export interface ProfessionGroup {
  group: string;
  items: ProfessionDef[];
}

export const PROFESSION_GROUPS: ProfessionGroup[] = [
  {
    group: "Technology",
    items: [
      { id: "software_engineer",  label: "Software Engineer" },
      { id: "frontend_engineer",  label: "Frontend Engineer" },
      { id: "backend_engineer",   label: "Backend Engineer" },
      { id: "devops_sre",         label: "DevOps / SRE" },
      { id: "data_ml",            label: "Data Scientist / ML Engineer" },
      { id: "qa_sdet",            label: "QA / SDET" },
      { id: "product_manager",    label: "Product Manager" },
      { id: "designer",           label: "Designer (UI/UX)" },
      { id: "tech_writer",        label: "Technical Writer" },
      { id: "consultant",         label: "Technical Consultant" },
    ],
  },
  {
    group: "Legal & Finance",
    items: [
      { id: "chartered_accountant", label: "Chartered Accountant (CA)" },
      { id: "lawyer",               label: "Lawyer / Advocate" },
      { id: "financial_advisor",    label: "Financial Advisor" },
      { id: "tax_consultant",       label: "Tax Consultant" },
      { id: "cs_company_secretary", label: "Company Secretary (CS)" },
    ],
  },
  {
    group: "Health & Medicine",
    items: [
      { id: "doctor",          label: "Doctor / Physician" },
      { id: "dentist",         label: "Dentist" },
      { id: "psychologist",    label: "Psychologist / Therapist" },
      { id: "physiotherapist", label: "Physiotherapist" },
      { id: "dietician",       label: "Dietician / Nutritionist" },
    ],
  },
  {
    group: "Fitness & Wellness",
    items: [
      { id: "gym_trainer",      label: "Gym Trainer / Personal Trainer" },
      { id: "yoga_instructor",  label: "Yoga Instructor" },
      { id: "life_coach",       label: "Life Coach / Wellness Coach" },
    ],
  },
  {
    group: "Education & Coaching",
    items: [
      { id: "tutor",         label: "Tutor / Academic Coach" },
      { id: "career_coach",  label: "Career Coach" },
      { id: "teacher",       label: "Teacher / Educator" },
    ],
  },
  {
    group: "Creative & Other",
    items: [
      { id: "architect",         label: "Architect" },
      { id: "interior_designer", label: "Interior Designer" },
      { id: "photographer",      label: "Photographer / Videographer" },
      { id: "other",             label: "Other" },
    ],
  },
];

// Flat list for backend validation mirror
export const PROFESSIONS: ProfessionDef[] = PROFESSION_GROUPS.flatMap((g) => g.items);
