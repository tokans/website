/**
 * Partner-listing row mapping (P1). partner_listings is a public projection of
 * onboarded professionals (the "ads"); other suite apps consume the same data
 * via the signed partner master. See docs/BUILD-PLAN.md §4.
 */
import type { PartnerListing } from "./backend/contract.js";

export interface PartnerRow {
  id: string;
  professional_user_id: string;
  name: string | null;
  headline: string | null;
  profession: string | null;
  skills: unknown; // JSONB → array
  role_category: string;
}

export function mapPartnerRow(r: PartnerRow): PartnerListing {
  return {
    id: r.id,
    professionalUserId: r.professional_user_id,
    name: r.name,
    headline: r.headline,
    profession: r.profession,
    skills: Array.isArray(r.skills) ? (r.skills as string[]) : [],
    roleCategory: r.role_category,
  };
}

/** Parse a free-text "comma, separated, skills" answer into a capped string[]. */
export function parseSkills(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}
