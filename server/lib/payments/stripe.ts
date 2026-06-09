/**
 * Stripe Checkout adapter (no SDK — Stripe REST API via fetch).
 * Requires STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* for subs).
 * See docs/payments-setup.md for the full external setup checklist.
 */
import { createHmac, timingSafeEqual } from "crypto";
import "../env.js";
import {
  PaymentsUnavailableError,
  type CheckoutResult,
  type DonationCheckoutInput,
  type PaymentEvent,
  type PaymentsPort,
  type SubscriptionCheckoutInput,
} from "./types.js";

const API = "https://api.stripe.com/v1";

function secretKey(): string {
  const k = process.env["STRIPE_SECRET_KEY"];
  if (!k) throw new PaymentsUnavailableError("STRIPE_SECRET_KEY is not set");
  return k;
}

interface StripeSession {
  id: string;
  url: string;
}

async function createSession(form: Record<string, string>): Promise<StripeSession> {
  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
  const json = (await res.json()) as {
    id?: string;
    url?: string | null;
    error?: { message?: string };
  };
  if (!res.ok || !json.id || !json.url) {
    throw new PaymentsUnavailableError(
      `Stripe checkout failed: ${json.error?.message ?? `HTTP ${res.status}`}`
    );
  }
  return { id: json.id, url: json.url };
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const kv: Record<string, string> = {};
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1);
  }
  const t = kv["t"];
  const v1 = kv["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class StripePayments implements PaymentsPort {
  async createDonationCheckout(input: DonationCheckoutInput): Promise<CheckoutResult> {
    const form: Record<string, string> = {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(input.amountMinor),
      "line_items[0][price_data][product_data][name]": "Tokans donation",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    };
    if (input.email) form["customer_email"] = input.email;
    const s = await createSession(form);
    return { url: s.url, ref: s.id, provider: "stripe", settledImmediately: false };
  }

  async createSubscriptionCheckout(
    input: SubscriptionCheckoutInput
  ): Promise<CheckoutResult> {
    const priceId = process.env[input.plan.priceEnv];
    if (!priceId) {
      throw new PaymentsUnavailableError(
        `${input.plan.priceEnv} is not set (Stripe Price id for plan ${input.plan.id})`
      );
    }
    const form: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: input.userId,
      "metadata[userId]": input.userId,
      "metadata[plan]": input.plan.id,
      customer_email: input.email,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    };
    const s = await createSession(form);
    return { url: s.url, ref: s.id, provider: "stripe", settledImmediately: false };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent> {
    const secret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!secret) throw new PaymentsUnavailableError("STRIPE_WEBHOOK_SECRET is not set");
    if (!verifySignature(rawBody, signature, secret)) {
      throw new PaymentsUnavailableError("Invalid Stripe webhook signature");
    }
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const obj = event.data?.object ?? {};

    if (event.type === "checkout.session.completed") {
      const id = String(obj["id"] ?? "");
      if (obj["mode"] === "subscription") {
        const meta = (obj["metadata"] as Record<string, string> | undefined) ?? {};
        const ref = (obj["client_reference_id"] as string | undefined) ?? null;
        return {
          kind: "subscription.activated",
          ref: id,
          userId: meta["userId"] ?? ref,
          plan: meta["plan"] ?? null,
        };
      }
      return { kind: "donation.completed", ref: id };
    }
    if (event.type === "customer.subscription.deleted") {
      // ref here is the Stripe subscription id (≠ checkout session id stored at
      // creation) — full reconciliation is a TODO (docs/payments-setup.md).
      return { kind: "subscription.canceled", ref: String(obj["id"] ?? "") };
    }
    return { kind: "ignored" };
  }
}
