import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "crypto";
import { MockPayments } from "../../api/lib/payments/mock.js";
import { StripePayments } from "../../api/lib/payments/stripe.js";
import { PaymentsUnavailableError } from "../../api/lib/payments/types.js";
import { getPayments } from "../../api/lib/payments/index.js";
import { getPlan } from "../../api/lib/plans.js";

describe("MockPayments", () => {
  const mock = new MockPayments();

  it("settles a donation immediately and echoes the success url", async () => {
    const r = await mock.createDonationCheckout({
      amountMinor: 10000,
      currency: "INR",
      email: null,
      successUrl: "https://x/donate?status=success",
      cancelUrl: "https://x/donate?status=cancel",
    });
    expect(r.provider).toBe("mock");
    expect(r.settledImmediately).toBe(true);
    expect(r.url).toBe("https://x/donate?status=success");
    expect(r.ref).toMatch(/^mock_don_/);
  });

  it("settles a subscription immediately", async () => {
    const r = await mock.createSubscriptionCheckout({
      userId: "u1",
      email: "a@b.c",
      plan: getPlan("pro_monthly")!,
      successUrl: "https://x/ok",
      cancelUrl: "https://x/no",
    });
    expect(r.ref).toMatch(/^mock_sub_/);
    expect(r.settledImmediately).toBe(true);
  });

  it("ignores webhooks (no real gateway)", async () => {
    expect(await mock.parseWebhook()).toEqual({ kind: "ignored" });
  });
});

describe("StripePayments.parseWebhook signature", () => {
  const SECRET = "whsec_test";
  beforeEach(() => {
    process.env["STRIPE_WEBHOOK_SECRET"] = SECRET;
  });
  afterEach(() => {
    delete process.env["STRIPE_WEBHOOK_SECRET"];
  });

  function sign(body: string, t = 1700000000): string {
    const v1 = createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
    return `t=${t},v1=${v1}`;
  }

  it("parses a completed subscription checkout into subscription.activated", async () => {
    const stripe = new StripePayments();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", mode: "subscription", metadata: { userId: "u9", plan: "pro_monthly" } } },
    });
    const event = await stripe.parseWebhook(body, sign(body));
    expect(event).toEqual({ kind: "subscription.activated", ref: "cs_1", userId: "u9", plan: "pro_monthly" });
  });

  it("parses a one-off completed checkout into donation.completed", async () => {
    const stripe = new StripePayments();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", mode: "payment" } },
    });
    expect(await stripe.parseWebhook(body, sign(body))).toEqual({
      kind: "donation.completed",
      ref: "cs_2",
    });
  });

  it("rejects an invalid signature", async () => {
    const stripe = new StripePayments();
    const body = JSON.stringify({ type: "x" });
    await expect(stripe.parseWebhook(body, "t=1,v1=deadbeef")).rejects.toBeInstanceOf(
      PaymentsUnavailableError
    );
  });

  it("throws when the webhook secret is unset", async () => {
    delete process.env["STRIPE_WEBHOOK_SECRET"];
    const stripe = new StripePayments();
    await expect(stripe.parseWebhook("{}", "t=1,v1=x")).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});

describe("getPayments adapter selection", () => {
  const saved = process.env["PAYMENTS_MODE"];
  afterEach(() => {
    vi.resetModules();
    if (saved === undefined) delete process.env["PAYMENTS_MODE"];
    else process.env["PAYMENTS_MODE"] = saved;
  });

  it("defaults to the mock adapter", async () => {
    delete process.env["PAYMENTS_MODE"];
    vi.resetModules();
    const { getPayments: fresh } = await import("../../api/lib/payments/index.js");
    // resetModules gives a fresh class identity, so compare by constructor name.
    expect(fresh().constructor.name).toBe("MockPayments");
  });

  it("returns a singleton", () => {
    expect(getPayments()).toBe(getPayments());
  });

  it("selects Stripe when PAYMENTS_MODE=stripe", async () => {
    process.env["PAYMENTS_MODE"] = "stripe";
    vi.resetModules();
    const { getPayments: fresh } = await import("../../api/lib/payments/index.js");
    const { StripePayments: FreshStripe } = await import("../../api/lib/payments/stripe.js");
    expect(fresh()).toBeInstanceOf(FreshStripe);
  });
});
