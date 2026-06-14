/**
 * Scrapes a website URL or GitHub repo looking for contact email addresses.
 * For regular sites: tries homepage then /contact.
 * For GitHub URLs: tries README.md (main then master branch).
 */

const MAILTO_RE = /href="mailto:([^"?#\s]+)"/gi;
// Broad email pattern for plain-text sources (README, etc.)
const PLAIN_EMAIL_RE = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;

function extractMailtoEmails(html: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MAILTO_RE.exec(html)) !== null) {
    const e = m[1]?.toLowerCase().trim();
    if (e && e.includes("@")) found.add(e);
  }
  MAILTO_RE.lastIndex = 0;
  return Array.from(found);
}

function extractPlainEmails(text: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  // Skip common false-positives like foo@example.com used in examples
  const EXCLUDE = /(@example\.|@domain\.|@your|@email\.|noreply@|no-reply@)/i;
  while ((m = PLAIN_EMAIL_RE.exec(text)) !== null) {
    const e = m[1]?.toLowerCase().trim();
    if (e && !EXCLUDE.test(e)) found.add(e);
  }
  PLAIN_EMAIL_RE.lastIndex = 0;
  return Array.from(found);
}

export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ── GitHub helpers ────────────────────────────────────────────────────────────

export interface GithubCoords {
  owner: string;
  repo: string | null;
}

/** Returns { owner, repo } if url is a github.com URL, else null. */
export function parseGithubUrl(url: string): GithubCoords | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts[0]) return null;
    return { owner: parts[0].toLowerCase(), repo: parts[1]?.toLowerCase() ?? null };
  } catch {
    return null;
  }
}

/** Returns the GitHub username from a stored github_url like https://github.com/username. */
export function githubLoginFromProfileUrl(githubUrl: string): string | null {
  try {
    const parts = new URL(githubUrl).pathname.split("/").filter(Boolean);
    return parts[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function fetchText(url: string, expectHtml = false): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Tokans/1.0 (site-verification; +https://tokans.org)" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (expectHtml) {
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("html")) return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

/** Scrape a GitHub README for a plain-text email address. */
export async function scrapeReadmeEmail(coords: GithubCoords): Promise<string | null> {
  if (!coords.repo) return null;
  const { owner, repo } = coords;
  for (const branch of ["main", "master"]) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const text = await fetchText(url);
    if (text) {
      const emails = extractPlainEmails(text);
      if (emails.length > 0) return emails[0]!;
    }
  }
  return null;
}

// ── Website scraper ───────────────────────────────────────────────────────────

const GITHUB_HREF_RE = /href="(https:\/\/github\.com\/[a-zA-Z0-9\-._]+\/[a-zA-Z0-9\-._]+)[/"#?]/g;

/** Extract the first github.com/owner/repo link from HTML. */
function extractGithubLink(html: string): GithubCoords | null {
  let m: RegExpExecArray | null;
  while ((m = GITHUB_HREF_RE.exec(html)) !== null) {
    const coords = parseGithubUrl(m[1]!);
    // Skip github.com/owner links without a repo (e.g. profile links, github.com/features)
    if (coords?.repo && coords.owner !== "features" && coords.owner !== "about") {
      GITHUB_HREF_RE.lastIndex = 0;
      return coords;
    }
  }
  GITHUB_HREF_RE.lastIndex = 0;
  return null;
}

export interface ScrapeResult {
  email: string | null;
  domain: string | null;
  /** A GitHub repo linked from the site (fallback when no email found). */
  githubCoords?: GithubCoords;
}

export async function scrapeContactEmail(websiteUrl: string): Promise<ScrapeResult> {
  const domain = domainFromUrl(websiteUrl);

  let base: URL;
  try {
    base = new URL(websiteUrl);
  } catch {
    return { email: null, domain };
  }

  const pages: string[] = [
    base.href,
    `${base.origin}/contact`,
    `${base.origin}/contact.html`,
  ];

  let foundGithub: GithubCoords | null = null;

  for (const url of pages) {
    const html = await fetchText(url, true);
    if (!html) continue;

    // mailto: links take priority.
    const emails = extractMailtoEmails(html);
    if (emails.length > 0) return { email: emails[0]!, domain };

    // Collect first GitHub repo link seen (use as fallback).
    if (!foundGithub) foundGithub = extractGithubLink(html);
  }

  return foundGithub
    ? { email: null, domain, githubCoords: foundGithub }
    : { email: null, domain };
}
