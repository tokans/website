import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Card, Field, Input, BtnPrimary, BtnGhost, InfoBox, StepHeader, FadeIn,
} from "../components/ui.js";
import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";

const PRESETS_RUPEES = [500, 1000, 2500, 5000];
const MIN_RUPEES = 50;

/**
 * Donations (tokans.org/donate). Anonymous-friendly — no sign-in required.
 * Creates a checkout via the payments gateway and redirects to it.
 */
export default function Donate() {
  const [rupees, setRupees] = useState<string>("1000");
  const [email,  setEmail]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");
  const [outcome, setOutcome] = useState<"success" | "cancel" | "">("");

  // Detect the post-redirect outcome.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "success") setOutcome("success");
    else if (status === "cancel") setOutcome("cancel");
  }, []);

  const rupeesNum = Number(rupees);
  const valid = Number.isFinite(rupeesNum) && rupeesNum >= MIN_RUPEES;

  const donate = async () => {
    if (!valid) return;
    setBusy(true);
    setErr("");
    try {
      const { url } = await api.donateCheckout({
        amountMinor: Math.round(rupeesNum * 100),
        currency: "INR",
        email: email.trim() || null,
      });
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the donation");
      setBusy(false);
    }
  };

  return (
    <PageLayout content={PAGE_CONTEXTS["donate"]!}>
      <Card maxWidth={480}>
        {outcome === "success" ? (
          <FadeIn k="ok">
            <div className="done-tick">✓</div>
            <StepHeader title="Thank you" sub="Your support helps professionals navigating the AI transition. Every contribution is pay-it-forward." />
            <BtnPrimary className="u-mt-24" onClick={() => { window.location.href = "/"; }}>
              Back to Tokans →
            </BtnPrimary>
          </FadeIn>
        ) : (
          <FadeIn k="form">
            <StepHeader
              eyebrow="MAKE A DONATION"
              title="Choose an amount"
              sub="Anonymous-friendly — no sign-in required. Funds go to professional access and support."
            />

            {outcome === "cancel" && (
              <InfoBox variant="neutral" className="u-mt-16">
                Your donation was cancelled — no charge was made.
              </InfoBox>
            )}

            <Field label="Amount (₹)" className="u-mt-16">
              <div className="u-flex u-gap-8" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {PRESETS_RUPEES.map((p) => (
                  <BtnGhost key={p} onClick={() => setRupees(String(p))}>
                    ₹{p.toLocaleString("en-IN")}
                  </BtnGhost>
                ))}
              </div>
              <Input
                type="number"
                value={rupees}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRupees(e.target.value)}
                placeholder={`Minimum ₹${MIN_RUPEES}`}
              />
            </Field>

            <Field label="Email" hint="Optional — for your receipt">
              <Input
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}

            <BtnPrimary className="u-mt-24" onClick={() => void donate()} disabled={!valid || busy}>
              {busy ? "Redirecting…" : `Donate ₹${valid ? rupeesNum.toLocaleString("en-IN") : "…"} →`}
            </BtnPrimary>
          </FadeIn>
        )}
      </Card>
    </PageLayout>
  );
}
