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
