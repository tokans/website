/**
 * Payments seam (P0). Same gateway powers donations (tokans.org/donate) and
 * professional subscriptions (tokans.org/professionals/subscribe).
 *
 * Easiest gateway = **Stripe Checkout** (hosted, no PCI scope, no SDK needed —
 * we call the REST API via fetch). A `mock` adapter is the default so the flows
 * work end-to-end with no external setup; see docs/payments-setup.md for the
 * external TODOs to go live (and the Razorpay note for India/INR).
 */
import type { PlanDef } from "../plans.js";

export interface CheckoutResult {
  url: string;
  ref: string;
  provider: "mock" | "stripe";
  /** Mock settles instantly (no real gateway/webhook); Stripe settles via webhook. */
  settledImmediately: boolean;
}

export interface DonationCheckoutInput {
  amountMinor: number;
  currency: string;
  email: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionCheckoutInput {
  userId: string;
  email: string;
  plan: PlanDef;
  successUrl: string;
  cancelUrl: string;
}

export type PaymentEvent =
  | { kind: "donation.completed"; ref: string }
  | { kind: "subscription.activated"; ref: string; userId: string | null; plan: string | null }
  | { kind: "subscription.canceled"; ref: string }
  | { kind: "ignored" };

export interface PaymentsPort {
  createDonationCheckout(input: DonationCheckoutInput): Promise<CheckoutResult>;
  createSubscriptionCheckout(input: SubscriptionCheckoutInput): Promise<CheckoutResult>;
  /** Verify + normalise a gateway webhook. Throws on invalid signature. */
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;
}

export class PaymentsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentsUnavailableError";
  }
}
