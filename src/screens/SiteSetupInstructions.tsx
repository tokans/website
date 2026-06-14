/**
 * SiteSetupInstructions — shown on the builder onboarding done screen.
 * Detects the kind of URL submitted and renders the appropriate hosting steps.
 */

interface Props {
  websiteUrl: string;
}

type UrlKind =
  | { kind: "github-repo"; owner: string; repo: string }
  | { kind: "github-pages"; owner: string; repo: string }
  | { kind: "custom" };

function detectKind(url: string): UrlKind {
  try {
    const u = new URL(url);
    if (u.hostname === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const owner = parts[0];
      const repo = parts[1];
      if (owner && repo) return { kind: "github-repo", owner, repo };
    }
    const ghPages = u.hostname.match(/^([^.]+)\.github\.io$/);
    if (ghPages) {
      const owner = ghPages[1]!;
      const parts = u.pathname.split("/").filter(Boolean);
      const repo = parts[0] ?? "";
      return { kind: "github-pages", owner, repo };
    }
  } catch {
    // fall through
  }
  return { kind: "custom" };
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
      <div style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
        background: "#1a1a1a", color: "#fff", display: "grid",
        placeItems: "center", fontSize: 12, fontWeight: 700,
      }}>{n}</div>
      <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5, paddingTop: 2 }}>{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      background: "#f0f0ec", borderRadius: 4, padding: "1px 5px",
      fontFamily: "monospace", fontSize: 13,
    }}>{children}</code>
  );
}

export default function SiteSetupInstructions({ websiteUrl }: Props) {
  const kind = detectKind(websiteUrl);

  if (kind.kind === "github-repo") {
    const { owner, repo } = kind;
    const pagesUrl = `https://${owner}.github.io/${repo}/`;
    return (
      <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8f8f5", borderRadius: 10, border: "1px solid #e5e3df" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1a1a1a" }}>
          Enable GitHub Pages for your repo
        </div>
        <Step n={1}>
          Go to your repo: <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2b6cb0" }}>{websiteUrl}</a>
        </Step>
        <Step n={2}>
          Click <strong>Settings</strong> → <strong>Pages</strong> (in the left sidebar under "Code and automation").
        </Step>
        <Step n={3}>
          Under <strong>Build and deployment</strong>, set <em>Source</em> to <strong>Deploy from a branch</strong>.
          Choose your branch (usually <Code>main</Code>) and folder (<Code>/ (root)</Code> or <Code>/docs</Code>).
        </Step>
        <Step n={4}>
          Click <strong>Save</strong>. GitHub will build and publish your site — it usually takes 1–2 minutes.
        </Step>
        <Step n={5}>
          Your site will be live at: <a href={pagesUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2b6cb0" }}>{pagesUrl}</a>
        </Step>
        <div style={{ marginTop: 12, fontSize: 13, color: "#888" }}>
          Once live, your app will appear in the Tokans directory at <Code>/apps/{repo.toLowerCase()}</Code>.
        </div>
      </div>
    );
  }

  if (kind.kind === "github-pages") {
    const { owner, repo } = kind;
    const repoUrl = repo ? `https://github.com/${owner}/${repo}` : `https://github.com/${owner}`;
    return (
      <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8f8f5", borderRadius: 10, border: "1px solid #e5e3df" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1a1a1a" }}>
          Your GitHub Pages URL is ready
        </div>
        <Step n={1}>
          {websiteUrl} is a GitHub Pages URL — great choice. Make sure Pages is enabled for{" "}
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2b6cb0" }}>{repoUrl}</a>.
        </Step>
        <Step n={2}>
          Go to the repo → <strong>Settings</strong> → <strong>Pages</strong> and confirm the site is published.
        </Step>
        <Step n={3}>
          Your app will appear in the Tokans directory once it's live at <Code>{websiteUrl}</Code>.
        </Step>
        <div style={{ marginTop: 12, fontSize: 13, color: "#888" }}>
          Tip: if your repo has a <Code>/docs</Code> folder, set Pages source to <Code>/docs</Code> so your landing page stays separate from your code.
        </div>
      </div>
    );
  }

  // Custom domain
  return (
    <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8f8f5", borderRadius: 10, border: "1px solid #e5e3df" }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1a1a1a" }}>
        Set up your custom domain
      </div>
      <Step n={1}>
        Log in to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.) and find your domain's DNS settings.
      </Step>
      <Step n={2}>
        Add a <Code>CNAME</Code> record pointing your domain (or <Code>www</Code> subdomain) to your hosting provider
        (e.g. <Code>your-username.github.io</Code> for GitHub Pages).
      </Step>
      <Step n={3}>
        If your hosting is on GitHub Pages, also go to your repo → <strong>Settings</strong> → <strong>Pages</strong>{" "}
        → <strong>Custom domain</strong> and enter your domain.
      </Step>
      <Step n={4}>
        DNS changes can take up to 48 hours to propagate. Once live, your app will appear in the directory.
      </Step>
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e6", borderRadius: 8, border: "1px solid #f0d080", fontSize: 13, color: "#7a5c00" }}>
        <strong>GoDaddy users:</strong> GoDaddy sometimes overrides DNS with a "domain forwarding" A-record that blocks CNAME
        resolution. If your CNAME doesn't work, check <em>Forwarding</em> in your GoDaddy dashboard and disable any active
        forwarding rules before adding the CNAME.
      </div>
    </div>
  );
}
