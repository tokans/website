import { useState, useEffect } from "react";
import { api } from "../api.js";
import { BtnPrimary, Card, FadeIn, Field, Input, Textarea, InfoBox } from "../components/ui.js";
import { ROLES, BUILDER_SUBTYPES, EMPLOYER_SUBTYPES, OPP_SUBTYPES } from "../data/roles.js";
import type { OnboardingTemplate, RoleId, SessionPayload } from "../lib/types.js";

const APP_URL = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://tokans.org";

// ── QR code via free public API ───────────────────────────────────────────────
function QrCode({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    <div className="admin-qr">
      <img src={qrUrl} alt="QR code" width={180} height={180} style={{ borderRadius: 8 }} />
      <div className="admin-qr-url">{url}</div>
      <a href={qrUrl} download="tokans-template-qr.png" className="admin-qr-dl">Download QR PNG</a>
    </div>
  );
}

// ── Template list ─────────────────────────────────────────────────────────────
function TemplateList({
  onCreate, onSelect,
}: {
  onCreate: () => void;
  onSelect: (t: OnboardingTemplate) => void;
}) {
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.adminListTemplates()
      .then((r) => setTemplates(r.templates))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete template "${name}"? This invalidates its QR code and URL.`)) return;
    await api.adminDeleteTemplate(id).catch(() => undefined);
    setTemplates((ts) => ts.filter((t) => t.id !== id));
  };

  if (loading) return <div className="admin-loading">Loading templates…</div>;

  return (
    <div className="admin-list">
      <div className="admin-list-header">
        <h2 className="admin-h2">Onboarding Templates</h2>
        <BtnPrimary onClick={onCreate}>+ New template</BtnPrimary>
      </div>
      {err && <InfoBox variant="error">{err}</InfoBox>}
      {templates.length === 0 ? (
        <div className="admin-empty">No templates yet. Create one to generate a shareable onboarding URL.</div>
      ) : (
        <div className="admin-table">
          {templates.map((t) => (
            <div key={t.id} className="admin-row" onClick={() => onSelect(t)}>
              <div className="admin-row-name">{t.name}</div>
              <div className="admin-row-meta">{t.role}{t.subType ? ` / ${t.subType}` : ""}</div>
              <div className="admin-row-date">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}</div>
              <button
                type="button"
                className="admin-row-del"
                onClick={(e) => { e.stopPropagation(); void handleDelete(t.id, t.name); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Context fields for each role/subtype ──────────────────────────────────────
type FieldDef = { key: string; label: string; type: "text" | "url" | "textarea"; placeholder: string };

function getContextFields(role: string, subType: string | null): FieldDef[] {
  if (role === "opportunity_seeker") return [
    { key: "displacement", label: "What changed in their last role because of AI?", type: "textarea", placeholder: "Leave blank to let user fill in" },
    { key: "next", label: "What are they looking for next?", type: "textarea", placeholder: "" },
  ];
  if (role === "builder" && subType === "idea_stage") return [
    { key: "buildDesc", label: "Describe what they're building", type: "textarea", placeholder: "" },
    { key: "websiteUrl", label: "Website / GitHub URL", type: "url", placeholder: "" },
  ];
  if (role === "builder" && subType === "vibe_founder") return [
    { key: "problem", label: "Most pressing problem", type: "textarea", placeholder: "" },
    { key: "websiteUrl", label: "Website URL", type: "url", placeholder: "" },
  ];
  if (role === "builder" && subType === "service_provider_company") return [
    { key: "description", label: "Services description", type: "textarea", placeholder: "" },
    { key: "websiteUrl", label: "Company website URL", type: "url", placeholder: "" },
  ];
  if (role === "employer") return [
    { key: "q1", label: "What does this person need to own?", type: "textarea", placeholder: "" },
    { key: "q2", label: "What does success look like in 60 days?", type: "textarea", placeholder: "" },
    { key: "q3", label: "Biggest technical bottleneck?", type: "textarea", placeholder: "" },
    { key: "q4", label: "Previous hiring attempts?", type: "textarea", placeholder: "" },
  ];
  if (role === "angel") return [
    { key: "investorUrl", label: "LinkedIn / AngelList URL", type: "url", placeholder: "" },
    { key: "investmentFocus", label: "Investment focus", type: "textarea", placeholder: "" },
  ];
  return [];
}

function subTypesFor(role: string) {
  if (role === "builder") return BUILDER_SUBTYPES.map((s) => ({ id: s.id, label: s.label }));
  if (role === "employer") return EMPLOYER_SUBTYPES.map((s) => ({ id: s.id, label: s.label }));
  if (role === "opportunity_seeker") return OPP_SUBTYPES.map((s) => ({ id: s, label: s }));
  return [];
}

// ── Template create ───────────────────────────────────────────────────────────
function TemplateCreate({ onBack, onCreated }: { onBack: () => void; onCreated: (valHash: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("");
  const [subType, setSubType] = useState<string>("");
  const [context, setContext] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const subtypes = subTypesFor(role);
  const fields = getContextFields(role, subType || null);

  const handleRoleChange = (r: string) => {
    setRole(r);
    setSubType("");
    setContext({});
  };

  const handleCreate = async () => {
    if (!name.trim() || !role) { setErr("Name and role are required"); return; }
    setSaving(true);
    setErr("");
    try {
      const filteredCtx: Record<string, string> = Object.fromEntries(
        Object.entries(context).filter(([, v]) => v.trim())
      );
      const res = await api.adminCreateTemplate({
        name: name.trim(),
        role,
        subType: subType || null,
        context: filteredCtx,
      });
      onCreated(res.valHash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-create">
      <button type="button" onClick={onBack} className="admin-back">← Back to templates</button>
      <h2 className="admin-h2">New Template</h2>

      <Field label="Template name (internal label)">
        <Input placeholder="e.g. Startup India Booth 2026" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="admin-section-label">Role</div>
      <div className="admin-role-grid">
        {ROLES.map((r) => (
          <div
            key={r.id}
            onClick={() => handleRoleChange(r.id)}
            className={`admin-role-chip${role === r.id ? " is-selected" : ""}`}
          >
            {r.label}
          </div>
        ))}
      </div>

      {subtypes.length > 0 && (
        <>
          <div className="admin-section-label u-mt-20">Sub-type (optional)</div>
          <div className="admin-subtype-list">
            <div
              onClick={() => setSubType("")}
              className={`admin-role-chip${!subType ? " is-selected" : ""}`}
            >
              Not pre-selected
            </div>
            {subtypes.map((s) => (
              <div
                key={s.id}
                onClick={() => setSubType(s.id)}
                className={`admin-role-chip${subType === s.id ? " is-selected" : ""}`}
              >
                {s.label}
              </div>
            ))}
          </div>
        </>
      )}

      {fields.length > 0 && (
        <>
          <div className="admin-section-label u-mt-20">Pre-fill context fields (all optional)</div>
          <InfoBox className="u-mb-16">Only fill in fields you want to pre-populate. Leave blank to let the user fill them in.</InfoBox>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <Textarea
                  placeholder={f.placeholder || "Leave blank"}
                  value={context[f.key] ?? ""}
                  onChange={(e) => setContext((c) => ({ ...c, [f.key]: e.target.value }))}
                  maxLength={600}
                  minHeight={70}
                />
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder || "Leave blank"}
                  value={context[f.key] ?? ""}
                  onChange={(e) => setContext((c) => ({ ...c, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </>
      )}

      {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}

      <div className="onboard-actions u-mt-24">
        <button type="button" onClick={onBack} className="onboard-back-btn">Cancel</button>
        <BtnPrimary onClick={() => void handleCreate()} disabled={!name.trim() || !role || saving}>
          {saving ? "Creating…" : "Create template →"}
        </BtnPrimary>
      </div>
    </div>
  );
}

// ── Template detail (QR + URL) ────────────────────────────────────────────────
function TemplateDetail({ template, valHash, onBack }: { template?: OnboardingTemplate; valHash?: string; onBack: () => void }) {
  const hash = valHash ?? template?.valHash ?? "";
  const url = `${APP_URL}/onboard?val=${hash}`;

  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="admin-detail">
      <button type="button" onClick={onBack} className="admin-back">← Back to templates</button>
      <h2 className="admin-h2">{template?.name ?? "Template created"}</h2>
      {template && (
        <div className="admin-detail-meta">
          Role: <strong>{template.role}</strong>{template.subType ? ` / ${template.subType}` : ""}
        </div>
      )}

      <QrCode url={url} />

      <div className="admin-url-row">
        <div className="admin-url-box">{url}</div>
        <button type="button" className="admin-copy-btn" onClick={copy}>
          {copied ? "Copied!" : "Copy URL"}
        </button>
      </div>

      <InfoBox className="u-mt-16">
        Append <code>&ref=your-label</code> to the URL per distribution channel.
        Example: <code>{url}&ref=startup-india-booth</code>
      </InfoBox>
    </div>
  );
}

// ── Root admin component ──────────────────────────────────────────────────────
type AdminView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; template: OnboardingTemplate }
  | { kind: "created"; valHash: string };

export default function AdminTemplates({ user }: { user: SessionPayload }) {
  const [view, setView] = useState<AdminView>({ kind: "list" });

  return (
    <div className="admin-page">
      <div className="admin-nav">
        <a href="/" className="admin-logo">Tokans <span style={{ fontWeight: 400, opacity: 0.5 }}>Admin</span></a>
        <div className="admin-nav-email">{user.email}</div>
      </div>

      <div className="admin-body">
        <FadeIn k={view.kind}>
          {view.kind === "list" && (
            <TemplateList
              onCreate={() => setView({ kind: "create" })}
              onSelect={(t) => setView({ kind: "detail", template: t })}
            />
          )}
          {view.kind === "create" && (
            <TemplateCreate
              onBack={() => setView({ kind: "list" })}
              onCreated={(valHash) => setView({ kind: "created", valHash })}
            />
          )}
          {view.kind === "detail" && (
            <TemplateDetail
              template={view.template}
              onBack={() => setView({ kind: "list" })}
            />
          )}
          {view.kind === "created" && (
            <TemplateDetail
              valHash={view.valHash}
              onBack={() => setView({ kind: "list" })}
            />
          )}
        </FadeIn>
      </div>
    </div>
  );
}
