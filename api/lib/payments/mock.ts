/**
 * Mock payments adapter (default). Settles instantly so /donate and /subscribe
 * work end-to-end without Stripe keys: the calling endpoint records the row and,
 * because settledImmediately=true, marks it completed/active right away.
 */
import { randomUUID } from "crypto";
import type {
  CheckoutResult,
  DonationCheckoutInput,
  PaymentEvent,
  PaymentsPort,
  SubscriptionCheckoutInput,
} from "./types.js";

export class MockPayments implements PaymentsPort {
  async createDonationCheckout(input: DonationCheckoutInput): Promise<CheckoutResult> {
    return {
      url: input.successUrl,
      ref: `mock_don_${randomUUID()}`,
      provider: "mock",
      settledImmediately: true,
    };
  }

  async createSubscriptionCheckout(
    input: SubscriptionCheckoutInput
  ): Promise<CheckoutResult> {
    return {
      url: input.successUrl,
      ref: `mock_sub_${randomUUID()}`,
      provider: "mock",
      settledImmediately: true,
    };
  }

  async parseWebhook(): Promise<PaymentEvent> {
    // Mock has no real gateway/webhook; checkout already settled.
    return { kind: "ignored" };
  }
}
