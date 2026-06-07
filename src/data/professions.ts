// Profession catalogue (frontend mirror of api/lib/professions.ts).
// Keep in sync — the backend validates the id on submit.

export interface ProfessionDef {
  id: string;
  label: string;
}

export const PROFESSIONS: ProfessionDef[] = [
  { id: "software_engineer", label: "Software Engineer" },
  { id: "frontend_engineer", label: "Frontend Engineer" },
  { id: "backend_engineer", label: "Backend Engineer" },
  { id: "devops_sre", label: "DevOps / SRE" },
  { id: "data_ml", label: "Data Scientist / ML Engineer" },
  { id: "qa_sdet", label: "QA / SDET" },
  { id: "product_manager", label: "Product Manager" },
  { id: "designer", label: "Designer (UI/UX)" },
  { id: "tech_writer", label: "Technical Writer" },
  { id: "consultant", label: "Technical Consultant" },
  { id: "other", label: "Other" },
];
