/**
 * ListApp — the app-listing onboarding form.
 *
 * Reached at /list-app (from the /apps directory CTA and the builder onboarding
 * done screen). Collects everything the native /apps/<slug> detail page renders —
 * identity, features, a demo video link, per-OS download links, screenshots — and
 * posts it via api.registerApp as an AppContent payload. On success it links to
 * the freshly-listed page.
 */
import { useMemo, useState, type ChangeEvent } from "react";
import { api } from "../api.js";
import { Card, Field, Input, Textarea, Select, BtnPrimary, InfoBox, StepHeader } from "../components/ui.js";
import { PageLayout } from "../components/site.js";
import type {
  AppContent, AppDownload, AppDownloadOs, AppFeature, AppListing,
  AppRegisterBody, AppScreenshot, SessionPayload,
} from "../lib/types.js";

const PANEL = {
  image: "/images/dev.png",
  imageAlt: "List your app on the Tokans network",
  eyebrow: "LIST YOUR APP",
  title: "Put your app in the directory",
  subtitle:
    "Answer a few questions and drop in the links — features, a demo video, and a download for each platform. We render a native, privacy-native page for it at tokans.org/apps.",
  points: [
    "Every app built on sharedCoreLib is eligible",
    "Your page matches the rest of tokans.org — no hosting needed",
    "Download buttons auto-detect the visitor's OS",
  ],
};

const OS_OPTIONS: { value: AppDownloadOs; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "android", label: "Android" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

const emptyFeature = (): AppFeature => ({ icon: "", title: "", body: "" });
const emptyDownload = (): AppDownload => ({ os: "windows", arch: "", label: "", url: "" });
const emptyShot = (): AppScreenshot => ({ url: "", caption: "" });

// Small inline "section" + "remove row" helpers — the form is long, so keep the
// chrome lightweight rather than introducing new shared components.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, fontSize: 15, margin: "26px 0 6px", color: "#0C1929" }}>{children}</div>;
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", color: "#4A6080", cursor: "pointer", fontSize: 13, padding: 0 }}>
      Remove
    </button>
  );
}
function RowCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, marginBottom: 12, background: "#F8FAFC" }}>
      {children}
    </div>
  );
}

export default function ListApp({ user }: { user: SessionPayload }) {
  void user; // session is required to reach this screen; not otherwise rendered
  const [name, setName] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [usesScl, setUsesScl] = useState("yes");

  const [features, setFeatures] = useState<AppFeature[]>([emptyFeature()]);
  const [demoUrl, setDemoUrl] = useState("");
  const [demoCaption, setDemoCaption] = useState("");
  const [downloads, setDownloads] = useState<AppDownload[]>([emptyDownload()]);
  const [shots, setShots] = useState<AppScreenshot[]>([]);
  const [privacyTitle, setPrivacyTitle] = useState("");
  const [privacyBody, setPrivacyBody] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<AppListing | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);

  // Generic row mutators for the repeatable lists.
  function patch<T>(list: T[], i: number, key: keyof T, value: T[keyof T]): T[] {
    return list.map((row, idx) => (idx === i ? { ...row, [key]: value } : row));
  }

  const valid = useMemo(
    () => name.trim().length > 0 && /^[a-z][a-z0-9-]*$/.test(effectiveSlug),
    [name, effectiveSlug],
  );

  function buildContent(): AppContent {
    const content: AppContent = {};
    if (heroTagline.trim()) content.heroTagline = heroTagline.trim();

    const fs = features
      .filter((f) => f.title.trim() && f.body.trim())
      .map((f) => ({ ...(f.icon?.trim() ? { icon: f.icon.trim() } : {}), title: f.title.trim(), body: f.body.trim() }));
    if (fs.length) content.features = fs;

    if (demoUrl.trim()) content.demo = { videoUrl: demoUrl.trim(), ...(demoCaption.trim() ? { caption: demoCaption.trim() } : {}) };

    const ds = downloads
      .filter((d) => d.url.trim())
      .map((d) => ({ os: d.os, ...(d.arch?.trim() ? { arch: d.arch.trim() } : {}), label: d.label.trim() || d.os, url: d.url.trim() }));
    if (ds.length) content.downloads = ds;

    const ss = shots.filter((s) => s.url.trim()).map((s) => ({ url: s.url.trim(), ...(s.caption?.trim() ? { caption: s.caption.trim() } : {}) }));
    if (ss.length) content.screenshots = ss;

    if (privacyTitle.trim()) content.privacyNote = { title: privacyTitle.trim(), body: privacyBody.trim() };
    return content;
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      const content = buildContent();
      const body: AppRegisterBody = {
        name: name.trim(),
        slug: effectiveSlug,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        repoUrl: repoUrl.trim() || null,
        siteUrl: siteUrl.trim() || null,
        usesSharedCoreLib: usesScl === "yes",
        content: Object.keys(content).length ? content : null,
      };
      const listing = await api.registerApp(body);
      setDone(listing);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not list your app");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <PageLayout content={PANEL}>
        <Card maxWidth={560}>
          <StepHeader eyebrow="LISTED" title={`${done.name} is in the directory`} />
          <InfoBox variant="neutral">
            Your app page is live at{" "}
            <a href={`/apps/${done.slug}`} style={{ color: "#0369A1", fontWeight: 600 }}>tokans.org/apps/{done.slug}</a>.
          </InfoBox>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="ui-btn ui-btn--primary" href={`/apps/${done.slug}`}>View your page →</a>
            <a className="ui-btn ui-btn--social" href="/apps">Back to directory</a>
          </div>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout content={PANEL}>
      <Card maxWidth={620}>
        <StepHeader eyebrow="NEW LISTING" title="List your app" sub="Everything here renders on your app's tokans.org page." />

        {/* ── Identity ── */}
        <Field label="App name">
          <Input value={name} placeholder="e.g. myFinance"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
        </Field>
        <Field label="URL slug" hint={`Your page will live at /apps/${effectiveSlug || "your-app"}`}
          error={effectiveSlug && !/^[a-z][a-z0-9-]*$/.test(effectiveSlug) ? "Lowercase letters, digits and hyphens only" : undefined}>
          <Input value={effectiveSlug} placeholder="your-app"
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setSlugEdited(true); setSlug(e.target.value); }} />
        </Field>
        <Field label="Tagline" hint="One short line shown in the directory and under the title.">
          <Input value={tagline} placeholder="Your money, on your machine."
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTagline(e.target.value)} />
        </Field>
        <Field label="Hero subtitle" hint="A longer sentence under the title on your page (optional).">
          <Textarea value={heroTagline} maxLength={240} minHeight={64}
            placeholder="A private, offline-first personal finance tracker. No account, no cloud."
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHeroTagline(e.target.value)} />
        </Field>
        <Field label="Description" hint="Optional longer description.">
          <Textarea value={description} maxLength={400} minHeight={72}
            placeholder="What your app does and who it's for."
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
        </Field>
        <Field label="Repository URL" hint="GitHub/GitLab link (optional).">
          <Input value={repoUrl} placeholder="https://github.com/you/your-app"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)} />
        </Field>
        <Field label="Website URL" hint="Your app's own site, if any (optional).">
          <Input value={siteUrl} placeholder="https://your-app.example.com"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSiteUrl(e.target.value)} />
        </Field>
        <Field label="Built on sharedCoreLib?">
          <Select title="Built on sharedCoreLib" value={usesScl}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setUsesScl(e.target.value)}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>

        {/* ── Features ── */}
        <SectionTitle>Features</SectionTitle>
        <div className="ui-field-hint" style={{ marginBottom: 8 }}>The cards shown on your page. Icon is an optional emoji.</div>
        {features.map((f, i) => (
          <RowCard key={i}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 64 }}>
                <Field label="Icon"><Input value={f.icon ?? ""} placeholder="📊"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFeatures(patch(features, i, "icon", e.target.value))} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Title"><Input value={f.title} placeholder="Net worth over time"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFeatures(patch(features, i, "title", e.target.value))} /></Field>
              </div>
            </div>
            <Field label="Body"><Textarea value={f.body} maxLength={400} minHeight={56} placeholder="What this feature does."
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFeatures(patch(features, i, "body", e.target.value))} /></Field>
            {features.length > 1 && <RemoveBtn onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} />}
          </RowCard>
        ))}
        <button type="button" onClick={() => setFeatures([...features, emptyFeature()])}
          className="ui-btn ui-btn--social" style={{ marginBottom: 8 }}>+ Add feature</button>

        {/* ── Demo ── */}
        <SectionTitle>Demo video</SectionTitle>
        <Field label="Video URL" hint="Direct link to an .mp4 (or similar). Shown as an inline player.">
          <Input value={demoUrl} placeholder="https://.../demo.mp4"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDemoUrl(e.target.value)} />
        </Field>
        <Field label="Caption">
          <Input value={demoCaption} placeholder="Importing a spreadsheet."
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDemoCaption(e.target.value)} />
        </Field>

        {/* ── Downloads ── */}
        <SectionTitle>Downloads</SectionTitle>
        <div className="ui-field-hint" style={{ marginBottom: 8 }}>One link per platform. The page shows the visitor's OS first.</div>
        {downloads.map((d, i) => (
          <RowCard key={i}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 120 }}>
                <Field label="Platform"><Select title="Platform" value={d.os}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setDownloads(patch(downloads, i, "os", e.target.value as AppDownloadOs))}>
                  {OS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Label"><Input value={d.label} placeholder="Windows (.msi)"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDownloads(patch(downloads, i, "label", e.target.value))} /></Field>
              </div>
            </div>
            <Field label="Download URL"><Input value={d.url} placeholder="https://.../app_1.0_x64.msi"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDownloads(patch(downloads, i, "url", e.target.value))} /></Field>
            {downloads.length > 1 && <RemoveBtn onClick={() => setDownloads(downloads.filter((_, idx) => idx !== i))} />}
          </RowCard>
        ))}
        <button type="button" onClick={() => setDownloads([...downloads, emptyDownload()])}
          className="ui-btn ui-btn--social" style={{ marginBottom: 8 }}>+ Add platform</button>

        {/* ── Screenshots ── */}
        <SectionTitle>Screenshots <span style={{ fontWeight: 400, color: "#8AAAC8" }}>(optional)</span></SectionTitle>
        {shots.map((s, i) => (
          <RowCard key={i}>
            <Field label="Image URL"><Input value={s.url} placeholder="https://.../screenshot.png"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShots(patch(shots, i, "url", e.target.value))} /></Field>
            <Field label="Caption"><Input value={s.caption ?? ""} placeholder="The dashboard."
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShots(patch(shots, i, "caption", e.target.value))} /></Field>
            <RemoveBtn onClick={() => setShots(shots.filter((_, idx) => idx !== i))} />
          </RowCard>
        ))}
        <button type="button" onClick={() => setShots([...shots, emptyShot()])}
          className="ui-btn ui-btn--social" style={{ marginBottom: 8 }}>+ Add screenshot</button>

        {/* ── Privacy note ── */}
        <SectionTitle>Closing note <span style={{ fontWeight: 400, color: "#8AAAC8" }}>(optional)</span></SectionTitle>
        <Field label="Heading">
          <Input value={privacyTitle} placeholder="No backend. No telemetry."
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPrivacyTitle(e.target.value)} />
        </Field>
        <Field label="Body">
          <Textarea value={privacyBody} maxLength={400} minHeight={64} placeholder="All data lives on your own machine."
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrivacyBody(e.target.value)} />
        </Field>

        {err && <InfoBox variant="error" className="u-mt-16">{err}</InfoBox>}
        <div style={{ marginTop: 18 }}>
          <BtnPrimary onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? "Listing…" : "List my app"}
          </BtnPrimary>
        </div>
      </Card>
    </PageLayout>
  );
}
