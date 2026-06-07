# Payments setup (donations + professional subscriptions)

Both `tokans.org/donate` and `tokans.org/professionals/subscribe` go through one
payments seam (`api/lib/payments/`). It runs in **mock mode by default** (no setup,
settles instantly) so the flows work end-to-end locally. To take real money you
must complete the external steps below and set `PAYMENTS_MODE=stripe`.

## Gateway choice
Two real gateways behind the same `PaymentsPort` interface, plus a mock:
- **Razorpay — the India-based gateway** (UPI, cards, netbanking; INR subscriptions
  via RBI e-mandate). **Primary for the India-first launch.**
- **Stripe Checkout** — global option (hosted, no PCI scope, no SDK; REST via `fetch`).

The seam is adapter-based, so the active gateway is an env switch (`PAYMENTS_MODE`)
with no caller changes.

## Adapters
- `PAYMENTS_MODE=mock` (default) → `MockPayments`: returns the success URL and marks
  the donation/subscription settled immediately. No keys, no webhook.
- `PAYMENTS_MODE=razorpay` → `RazorpayPayments`: Razorpay Checkout/Subscriptions + webhook.
- `PAYMENTS_MODE=stripe` → `StripePayments`: hosted Checkout + webhook.

## Environment variables
| Var | Mode | Purpose |
|---|---|---|
| `PAYMENTS_MODE` | all | `mock` (default), `razorpay`, or `stripe` |
| `PUBLIC_BASE_URL` | all | absolute origin for success/cancel URLs (else derived from request host) |
| `RAZORPAY_KEY_ID` | razorpay | API key id (`rzp_live_…` / `rzp_test_…`) |
| `RAZORPAY_KEY_SECRET` | razorpay | API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | razorpay | webhook signing secret (HMAC-SHA256) |
| `RAZORPAY_PLAN_PRO_MONTHLY` | razorpay | Plan id for the monthly subscription |
| `RAZORPAY_PLAN_PRO_YEARLY` | razorpay | Plan id for the yearly subscription |
| `STRIPE_SECRET_KEY` | stripe | server API key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | stripe | webhook signing secret (`whsec_…`) |
| `STRIPE_PRICE_PRO_MONTHLY` | stripe | Price id for the monthly plan |
| `STRIPE_PRICE_PRO_YEARLY` | stripe | Price id for the yearly plan |

## External TODOs to go live (Razorpay — India)
1. **Create a Razorpay account** and complete KYC/business activation.
2. **Create subscription Plans** (one per plan in `api/lib/plans.ts`); copy the Plan
   ids into `RAZORPAY_PLAN_PRO_MONTHLY` / `RAZORPAY_PLAN_PRO_YEARLY`. Set
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. **INR recurring needs an e-mandate** (UPI Autopay / cards / netbanking) per RBI
   rules — set up the mandate flow on the Subscriptions product.
4. **Add a webhook** → `https://tokans.org/api/payments/webhook`, subscribe to at
   least `payment.captured` / `subscription.activated` / `subscription.charged` /
   `subscription.cancelled`. Copy the secret into `RAZORPAY_WEBHOOK_SECRET`.
   Razorpay signs webhooks with **HMAC-SHA256 over the raw body** using that secret
   (header `X-Razorpay-Signature`) — same raw-body caveat as Stripe (item below).
5. **Donations** use a one-time Order/Payment Link; **subscriptions** use the
   Subscriptions API with the Plan id.

## External TODOs to go live (Stripe)
1. **Create a Stripe account** and activate it (business/KYC). For India, note the
   export/registered-business constraints and INR recurring (RBI e-mandate) rules —
   if these block you, switch to a Razorpay adapter.
2. **Create Products + recurring Prices** for each plan in `api/lib/plans.ts`; copy
   the Price ids into `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY`.
3. **Add a webhook endpoint** in the Stripe dashboard → `https://tokans.org/api/payments/webhook`,
   subscribed to at least `checkout.session.completed` (and `customer.subscription.deleted`
   for cancellations). Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Raw request body for signature verification.** `@vercel/node` parses the body,
   so `readRawBody()` may not byte-match the original payload and signature
   verification can fail. Fix one of:
   - serve the webhook from a runtime/config that preserves the raw body, or
   - read the request stream before any parsing.
   Until fixed, run the webhook only in environments where the raw body is intact.
5. **Set `PUBLIC_BASE_URL`** to the production origin so redirect URLs are correct.
6. **Subscription cancellation reconciliation.** At creation we store the *checkout
   session id* as `provider_ref`, but `customer.subscription.deleted` carries the
   *subscription id*. Persist the Stripe subscription id (from
   `checkout.session.completed`) to match cancellations reliably.
7. **Donation → Patron grant.** Issuing the sharedCoreLib Patron entitlement
   (`sharedcorelib/grant`) from a completed donation is a later cross-cutting step —
   not wired here.

## DB
Run the migration: `psql $DATABASE_URL -f schema.payments.sql` (tables `donations`,
`subscriptions`). An **active subscription is what unlocks the myWorkAssistant
download** — see `api/lib/backend/mock.ts` (`getProfessionalStatus` / `grantDownload`).

## Flows
- `POST /api/donate/checkout` → `{ url }` (anonymous OK) → redirect to gateway → `/donate?status=success`.
- `POST /api/professionals/subscribe` → `{ url }` (auth required) → gateway → `/professionals/subscribe?status=success`.
- `GET  /api/professionals/subscription` → current subscription status.
- `POST /api/payments/webhook` → settles donation/subscription (Stripe mode).
