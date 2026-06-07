/**
 * Subscription plans (P0). A professional subscribes to gain access to
 * myWorkAssistant + app-listing features (the listing features land later).
 * `priceEnv` names the env var holding the Stripe Price id for that plan.
 */
export interface PlanDef {
  id: string;
  label: string;
  amountMinor: number; // for display only; Stripe charges the configured Price
  currency: string;
  interval: "month" | "year";
  priceEnv: string;
}

export const PLANS: PlanDef[] = [
  {
    id: "pro_monthly",
    label: "Professional — Monthly",
    amountMinor: 49900, // ₹499
    currency: "INR",
    interval: "month",
    priceEnv: "STRIPE_PRICE_PRO_MONTHLY",
  },
  {
    id: "pro_yearly",
    label: "Professional — Yearly",
    amountMinor: 499000, // ₹4,990
    currency: "INR",
    interval: "year",
    priceEnv: "STRIPE_PRICE_PRO_YEARLY",
  },
];

export const DEFAULT_PLAN_ID = "pro_monthly";

const BY_ID = new Map(PLANS.map((p) => [p.id, p]));

export function isKnownPlan(id: string): boolean {
  return BY_ID.has(id);
}

export function getPlan(id: string): PlanDef | null {
  return BY_ID.get(id) ?? null;
}
