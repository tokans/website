import { describe, it, expect } from "vitest";
import { PLANS, DEFAULT_PLAN_ID, isKnownPlan, getPlan } from "../../api/lib/plans.js";

describe("subscription plans", () => {
  it("exposes the monthly + yearly plans", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["pro_monthly", "pro_yearly"]);
  });

  it("has a default plan that is itself a known plan", () => {
    expect(isKnownPlan(DEFAULT_PLAN_ID)).toBe(true);
  });

  it("resolves a known plan by id", () => {
    const plan = getPlan("pro_yearly");
    expect(plan).not.toBeNull();
    expect(plan?.interval).toBe("year");
    expect(plan?.currency).toBe("INR");
    expect(plan?.priceEnv).toBe("STRIPE_PRICE_PRO_YEARLY");
  });

  it("returns null / false for an unknown plan", () => {
    expect(getPlan("enterprise_unlimited")).toBeNull();
    expect(isKnownPlan("enterprise_unlimited")).toBe(false);
  });

  it("every plan carries a price-env binding and positive amount", () => {
    for (const p of PLANS) {
      expect(p.priceEnv).toMatch(/^STRIPE_PRICE_/);
      expect(p.amountMinor).toBeGreaterThan(0);
    }
  });
});
