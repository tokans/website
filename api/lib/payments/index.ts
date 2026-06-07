/**
 * Payments entry point. `getPayments()` selects the adapter by PAYMENTS_MODE:
 *   • PAYMENTS_MODE=mock   (default) → MockPayments — settles instantly, no setup.
 *   • PAYMENTS_MODE=stripe           → StripePayments — hosted Checkout via REST.
 */
import "../env.js";
import { MockPayments } from "./mock.js";
import { StripePayments } from "./stripe.js";
import type { PaymentsPort } from "./types.js";

let _payments: PaymentsPort | null = null;

export function getPayments(): PaymentsPort {
  if (_payments) return _payments;
  const mode = (process.env["PAYMENTS_MODE"] ?? "mock").toLowerCase();
  _payments = mode === "stripe" ? new StripePayments() : new MockPayments();
  return _payments;
}

export { PaymentsUnavailableError } from "./types.js";
export type {
  PaymentsPort,
  CheckoutResult,
  DonationCheckoutInput,
  SubscriptionCheckoutInput,
  PaymentEvent,
} from "./types.js";
