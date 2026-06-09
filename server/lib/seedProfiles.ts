/**
 * Synthetic, anonymised seed profiles for the First Tokan Task (P1).
 * These are deliberately fabricated (not real users), so a submission references
 * a text `seed_profile_id`, not a user FK. The real version would draw from a
 * curated library of 20–30 profiles (strategy docs).
 */
export interface SeedProfile {
  id: string;
  headline: string;
  skills: string[];
  summary: string;
  claims: string[];
}

export const SEED_PROFILES: SeedProfile[] = [
  {
    id: "sp_backend_01",
    headline: "Backend engineer · 6 yrs · payments & APIs",
    skills: ["Go", "PostgreSQL", "Kafka", "gRPC", "AWS"],
    summary:
      "Built and ran payment-adjacent services at a mid-size fintech. Owned a ledger service through two major migrations and an on-call rotation.",
    claims: [
      "Reduced p99 latency on the ledger API by 40% via query + index work.",
      "Led the migration off a monolith to three services with zero downtime.",
      "Mentored two juniors to mid-level over 18 months.",
    ],
  },
  {
    id: "sp_frontend_02",
    headline: "Frontend engineer · 4 yrs · design systems",
    skills: ["TypeScript", "React", "Accessibility", "Storybook", "CSS"],
    summary:
      "Shipped a company-wide design system adopted by 5 product teams. Strong on accessibility and component API design.",
    claims: [
      "Cut UI bug reports ~30% after introducing the shared component library.",
      "Drove WCAG AA compliance across the main app.",
      "Wrote the team's testing-library conventions.",
    ],
  },
  {
    id: "sp_data_03",
    headline: "Data / ML engineer · 5 yrs · pipelines & models",
    skills: ["Python", "Spark", "Airflow", "dbt", "scikit-learn"],
    summary:
      "Owned batch + streaming pipelines feeding a recommendation model. Comfortable from ingestion to model serving.",
    claims: [
      "Improved recommendation CTR by 12% with a reworked feature set.",
      "Cut pipeline cost ~25% by reworking partitioning.",
      "Set up the team's experiment-tracking workflow.",
    ],
  },
];

export function getSeedProfile(id: string): SeedProfile | null {
  return SEED_PROFILES.find((p) => p.id === id) ?? null;
}
