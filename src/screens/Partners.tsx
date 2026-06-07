import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import { Card, Field, Textarea, BtnPrimary, BtnGhost, InfoBox } from "../components/ui.js";
import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";
import { PROFESSIONS } from "../data/professions.js";
import { SAMPLE_PARTNERS } from "../data/sampleProfessionals.js";
import type { PartnerListing, SessionPayload, SessionResponse } from "../lib/types.js";

const PROFESSION_LABEL = new Map(PROFESSIONS.map((p) => [p.id, p.label]));

/**
 * Public partner directory (/partners) — the destination the privacy-preserving
 * ads link to. An end-user connects to a professional; that creates a backend
 * work item routed to the professional's myWorkAssistant inbox. Until the real
 * backend feed exists we show a sample directory of professionals of all types.
 */
export default function Partners() {
  const [partners, setPartners] = useState<PartnerListing[] | null>(null);
  const [user,     setUser]     = useState<SessionPayload | null>(null);

  const [openId,   setOpenId]   = useState<string | null>(null); // listing being contacted
  const [message,  setMessage]  = useState("");
  const [busy,     setBusy]     = useState(false);
  const [sentTo,   setSentTo]   = useState<Set<string>>(new Set());
  const [err,      setErr]      = useState("");

  useEffect(() => {
    api.listPartners()
      // Fall back to the sample directory when the backend has none yet.
      .then((r) => setPartners(r.partners.length ? r.partners : SAMPLE_PARTNERS))
      .catch(() => setPartners(SAMPLE_PARTNERS));
    api.session()
      .then((d) => { if ("authenticated" in d && d.authenticated) setUser((d as SessionResponse).user); })
      .catch(() => undefined);
  }, []);

  const startConnect = (id: string) => {
    setOpenId(id);
    setMessage("");
    setErr("");
  };

  const send = async (p: PartnerListing) => {
    setBusy(true); setErr("");
    try {
      await api.connect({ professionalUserId: p.professionalUserId, message: message.trim() });
      setSentTo((s) => new Set(s).add(p.id));
      setOpenId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send the request");
    } finally { setBusy(false); }
  };

  return (
    <PageLayout content={PAGE_CONTEXTS["partners"]!}>
      <Card>
        {partners === null ? (
          <div className="ui-step-sub">Loading…</div>
        ) : partners.length === 0 ? (
          <InfoBox variant="neutral">No partners listed yet.</InfoBox>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {partners.map((p) => {
              const sent = sentTo.has(p.id);
              return (
                <div key={p.id} className="ui-barrier">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <strong>{p.name ?? "Professional"}</strong>
                    <span className="dash-role-pill">
                      {(p.profession && PROFESSION_LABEL.get(p.profession)) ?? p.roleCategory}
                    </span>
                  </div>
                  {p.headline && <div className="ui-barrier-text">{p.headline}</div>}
                  {p.skills.length > 0 && (
                    <div className="ui-field-hint">{p.skills.join(" · ")}</div>
                  )}

                  {sent ? (
                    <InfoBox variant="success" className="u-mt-8">
                      Request sent — it's now in their inbox.
                    </InfoBox>
                  ) : !user ? (
                    <div className="ui-field-hint u-mt-8">
                      <a href="/?flow=login">Sign in</a> to connect.
                    </div>
                  ) : openId === p.id ? (
                    <div className="u-mt-8">
                      <Field label="Message">
                        <Textarea
                          value={message}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                          maxLength={500}
                          minHeight={72}
                          placeholder="Describe what you need help with…"
                        />
                      </Field>
                      {err && <InfoBox variant="error" className="u-mt-8">{err}</InfoBox>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <BtnPrimary onClick={() => void send(p)} disabled={busy}>
                          {busy ? "Sending…" : "Send request →"}
                        </BtnPrimary>
                        <BtnGhost onClick={() => setOpenId(null)}>Cancel</BtnGhost>
                      </div>
                    </div>
                  ) : (
                    <BtnPrimary className="u-mt-8" onClick={() => startConnect(p.id)}>
                      Connect →
                    </BtnPrimary>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
