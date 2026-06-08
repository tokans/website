import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import {
  Card, Field, Input, Textarea, BtnPrimary, InfoBox, StepHeader,
} from "../components/ui.js";
import type { AppListing, SessionPayload, SessionResponse } from "../lib/types.js";

/**
 * The /apps directory widget (browse listed apps + owner registration). The
 * dynamic island of the apps page; chrome and use-case copy are static HTML.
 */
export default function AppsDirectory() {
  const [apps,   setApps]   = useState<AppListing[] | null>(null);
  const [user,   setUser]   = useState<SessionPayload | null>(null);
  const [mine,   setMine]   = useState<AppListing[]>([]);

  const [name,   setName]   = useState("");
  const [repo,   setRepo]   = useState("");
  const [stack,  setStack]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    api.listApps().then((r) => setApps(r.apps)).catch(() => setApps([]));
    api.session()
      .then((d) => { if ("authenticated" in d && d.authenticated) setUser((d as SessionResponse).user); })
      .catch(() => undefined);
  }, []);

  const register = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      const app = await api.registerApp({
        name: name.trim(),
        repoUrl: repo.trim() || null,
        stack: stack.trim() || null,
      });
      setMine((m) => [app, ...m]);
      setName(""); setRepo(""); setStack("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not register the app");
    } finally { setBusy(false); }
  };

  const requestSupport = async (id: string) => {
    setErr("");
    try {
      const updated = await api.requestAppSupport(id);
      setMine((m) => m.map((a) => (a.id === id ? updated : a)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not request support");
    }
  };

  return (
    <>
      <Card maxWidth={720}>
        <StepHeader eyebrow="DIRECTORY" title="Browse listed apps" />

        {apps === null ? (
          <div className="ui-step-sub u-mt-16">Loading…</div>
        ) : apps.length === 0 ? (
          <InfoBox variant="neutral" className="u-mt-16">No apps listed yet.</InfoBox>
        ) : (
          <div className="u-mt-16" style={{ display: "grid", gap: 12 }}>
            {apps.map((a) => (
              <div key={a.id} className="ui-barrier">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <strong>{a.name}</strong>
                  <span className="dash-role-pill">{a.listed ? "SUPPORTED" : a.supportStatus.toUpperCase()}</span>
                </div>
                {a.tagline && <div className="ui-barrier-text">{a.tagline}</div>}
                <div className="ui-field-hint">
                  {a.stack ? `${a.stack} · ` : ""}{a.usesSharedCoreLib ? "sharedCoreLib" : "custom"}
                  {a.repoUrl ? <> · <a href={a.repoUrl} target="_blank" rel="noopener noreferrer">repo ↗</a></> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Owner: list your app */}
      <Card maxWidth={720} className="u-mt-16">
        <StepHeader eyebrow="LIST YOUR APP" title="Get your app supported" />
        {!user ? (
          <InfoBox variant="gold" className="u-mt-16">
            <a href="/?flow=login">Sign in</a> to list your app for Tokans support.
          </InfoBox>
        ) : (
          <>
            <Field label="App name" className="u-mt-16">
              <Input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. myJournal" />
            </Field>
            <Field label="Repository URL" hint="Optional">
              <Input value={repo} onChange={(e: ChangeEvent<HTMLInputElement>) => setRepo(e.target.value)} placeholder="https://github.com/…" />
            </Field>
            <Field label="Stack" hint="Optional">
              <Textarea value={stack} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setStack(e.target.value)} maxLength={160} minHeight={48} placeholder="e.g. Tauri + React + sharedCoreLib" />
            </Field>
            {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}
            <BtnPrimary className="u-mt-16" onClick={() => void register()} disabled={!name.trim() || busy}>
              {busy ? "Registering…" : "Register app →"}
            </BtnPrimary>

            {mine.length > 0 && (
              <div className="u-mt-24" style={{ display: "grid", gap: 12 }}>
                <div className="done-next-eyebrow">YOUR APPS</div>
                {mine.map((a) => (
                  <div key={a.id} className="ui-barrier">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong>{a.name}</strong>
                      <span className="dash-role-pill">{a.supportStatus.toUpperCase()}</span>
                    </div>
                    {a.supportStatus === "none" ? (
                      <BtnPrimary className="u-mt-8" onClick={() => void requestSupport(a.id)}>
                        Request support →
                      </BtnPrimary>
                    ) : a.supportStatus === "requested" ? (
                      <div className="ui-field-hint">Support requested — pending review.</div>
                    ) : (
                      <div className="ui-field-hint">Listed for support.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
