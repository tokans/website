import { useState, useEffect } from "react";
import { api } from "../api.js";
import Onboarding from "./Onboarding.js";
import type { RoleId, SessionPayload } from "../lib/types.js";

type TemplateState =
  | { status: "loading" }
  | { status: "loaded"; id: string; role: RoleId; subType: string | null; context: Record<string, string> }
  | { status: "not_found" }
  | { status: "error"; message: string };

export default function OnboardTemplate({
  user,
  val,
  ref: refLabel,
  onComplete,
  onLogout,
}: {
  user:       SessionPayload;
  val:        string;
  ref?:       string;
  onComplete: (session: { authenticated: true; user: SessionPayload }) => void;
  onLogout:   () => void;
}) {
  const [state, setState] = useState<TemplateState>({ status: "loading" });

  useEffect(() => {
    if (!val) { setState({ status: "not_found" }); return; }
    api.fetchOnboardTemplate(val)
      .then((t) => setState({
        status: "loaded",
        id: t.id,
        role: t.role as RoleId,
        subType: t.subType,
        context: Object.fromEntries(
          Object.entries(t.context).map(([k, v]) => [k, String(v ?? "")])
        ),
      }))
      .catch(() => setState({ status: "not_found" }));
  }, [val]);

  if (state.status === "loading") {
    return (
      <div className="onboard-page">
        <div className="splash-bar" style={{ maxWidth: 320, margin: "40vh auto 0" }}>
          <div className="splash-bar-fill" />
        </div>
      </div>
    );
  }

  // Template not found or invalid → fall back to generic onboarding
  if (state.status !== "loaded") {
    return (
      <Onboarding
        user={user}
        onComplete={onComplete}
        onLogout={onLogout}
        entryPath="onboard"
      />
    );
  }

  return (
    <Onboarding
      user={user}
      onComplete={onComplete}
      onLogout={onLogout}
      entryPath="onboard"
      initialRole={state.role}
      templateContext={state.context}
      templateId={state.id}
      {...(state.subType ? { initialSubType: state.subType } : {})}
      {...(refLabel ? { templateRef: refLabel } : {})}
    />
  );
}
