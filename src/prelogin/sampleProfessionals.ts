/**
 * Dummy partner directory data — professionals of every type. Used as a
 * fallback on /partners so the directory looks populated before the real
 * backend feed exists. These are clearly synthetic (ids prefixed `sample_`).
 */
import type { PartnerListing } from "../lib/types.js";

export const SAMPLE_PARTNERS: PartnerListing[] = [
  {
    id: "sample_1",
    professionalUserId: "sample_user_1",
    name: "Aarav Sharma",
    headline: "Backend engineer · 7 yrs · payments & distributed systems",
    profession: "backend_engineer",
    skills: ["Go", "PostgreSQL", "Kafka", "gRPC", "AWS"],
    roleCategory: "Partner",
  },
  {
    id: "sample_2",
    professionalUserId: "sample_user_2",
    name: "Maya Rodriguez",
    headline: "Frontend engineer · 5 yrs · design systems & accessibility",
    profession: "frontend_engineer",
    skills: ["TypeScript", "React", "Tailwind", "Storybook", "WCAG"],
    roleCategory: "Partner",
  },
  {
    id: "sample_3",
    professionalUserId: "sample_user_3",
    name: "Daniel Okafor",
    headline: "DevOps / SRE · 8 yrs · reliability at scale",
    profession: "devops_sre",
    skills: ["Kubernetes", "Terraform", "Prometheus", "AWS", "Go"],
    roleCategory: "Partner",
  },
  {
    id: "sample_4",
    professionalUserId: "sample_user_4",
    name: "Priya Nair",
    headline: "Data / ML engineer · 6 yrs · pipelines & recommender systems",
    profession: "data_ml",
    skills: ["Python", "Spark", "Airflow", "dbt", "PyTorch"],
    roleCategory: "Partner",
  },
  {
    id: "sample_5",
    professionalUserId: "sample_user_5",
    name: "Sofia Lindqvist",
    headline: "Product designer · 6 yrs · 0→1 product & UX research",
    profession: "designer",
    skills: ["Figma", "Prototyping", "Design systems", "User research"],
    roleCategory: "Partner",
  },
  {
    id: "sample_6",
    professionalUserId: "sample_user_6",
    name: "Kenji Tanaka",
    headline: "Full-stack engineer · 9 yrs · takes over legacy codebases",
    profession: "software_engineer",
    skills: ["TypeScript", "Node.js", "React", "PostgreSQL", "Rust"],
    roleCategory: "Partner",
  },
  {
    id: "sample_7",
    professionalUserId: "sample_user_7",
    name: "Amara Devi",
    headline: "Product manager · 7 yrs · marketplaces & growth",
    profession: "product_manager",
    skills: ["Discovery", "Roadmapping", "Analytics", "A/B testing"],
    roleCategory: "Partner",
  },
  {
    id: "sample_8",
    professionalUserId: "sample_user_8",
    name: "Lucas Müller",
    headline: "QA / SDET · 5 yrs · test automation & CI quality gates",
    profession: "qa_sdet",
    skills: ["Playwright", "Vitest", "CI/CD", "Load testing"],
    roleCategory: "Partner",
  },
  {
    id: "sample_9",
    professionalUserId: "sample_user_9",
    name: "Ife Adeyemi",
    headline: "Technical writer · 4 yrs · developer docs & API references",
    profession: "tech_writer",
    skills: ["Docs-as-code", "OpenAPI", "Markdown", "DX"],
    roleCategory: "Partner",
  },
  {
    id: "sample_10",
    professionalUserId: "sample_user_10",
    name: "Elena Petrova",
    headline: "Technical consultant · 11 yrs · architecture & due diligence",
    profession: "consultant",
    skills: ["System design", "Cloud", "Code audits", "Mentoring"],
    roleCategory: "Partner",
  },
];
