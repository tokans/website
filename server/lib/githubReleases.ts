/**
 * Resolves an app's *latest* release asset from its GitHub repo, so the
 * /apps/<slug> download buttons never point at a hard-pinned version.
 *
 * The detail page stores a per-platform download list (apps.content.downloads),
 * but those URLs are seeded against a specific tag (e.g. v1.0.4) and go stale the
 * moment a new release ships. Instead the download endpoint asks GitHub for the
 * repo's `releases/latest` and matches the right asset by filename, falling back
 * to the stored URL only when GitHub is unreachable or has no matching asset.
 *
 * GitHub's unauthenticated API allows 60 req/hr/IP, so results are cached in
 * Redis (best-effort — a missing/over-quota cache just means a live fetch). A
 * GITHUB_TOKEN/GH_TOKEN, if present, lifts the limit but is not required.
 */
import { parseGithubUrl } from "./scraper.js";
import { getRedis } from "./redis.js";
import type { AppDownloadOs } from "./backend/contract.js";

/** A successful resolution caches for an hour; an empty/failed one re-tries sooner. */
const CACHE_TTL_SECONDS = 3600;
const NEG_CACHE_TTL_SECONDS = 300;

export interface ReleaseAsset {
  name: string;
  url: string;
}

interface LatestRelease {
  tag: string | null;
  assets: ReleaseAsset[];
}

/**
 * Asset-filename matchers per OS, most-preferred first. Tuned for Tauri v2 bundle
 * output (.msi/.dmg/.AppImage/.apk) with sensible secondary fallbacks.
 */
const OS_ASSET_MATCHERS: Record<AppDownloadOs, readonly RegExp[]> = {
  windows: [/\.msi$/i, /-setup\.exe$/i, /\.exe$/i],
  macos: [/\.dmg$/i, /\.app\.tar\.gz$/i],
  linux: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i],
  android: [/\.apk$/i],
};

/** First asset whose name matches the OS's preference list, else null. */
export function pickAssetForOs(
  assets: readonly ReleaseAsset[],
  os: AppDownloadOs
): ReleaseAsset | null {
  for (const re of OS_ASSET_MATCHERS[os] ?? []) {
    const hit = assets.find((a) => re.test(a.name));
    if (hit) return hit;
  }
  return null;
}

async function cacheGet(key: string): Promise<LatestRelease | undefined> {
  try {
    const v = await getRedis().get<LatestRelease>(key);
    return v ?? undefined;
  } catch {
    return undefined; // no/over-quota cache → fall through to a live fetch
  }
}

async function cacheSet(key: string, value: LatestRelease, ttl: number): Promise<void> {
  try {
    await getRedis().set(key, value, { ex: ttl });
  } catch {
    /* best-effort */
  }
}

/** Fetch `releases/latest` from the GitHub API; null on any error/non-2xx. */
async function fetchLatestRelease(owner: string, repo: string): Promise<LatestRelease | null> {
  const headers: Record<string, string> = {
    "User-Agent": "Tokans/1.0 (+https://tokans.org)",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env["GITHUB_TOKEN"] || process.env["GH_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      assets?: { name?: string; browser_download_url?: string }[];
    };
    const assets: ReleaseAsset[] = (data.assets ?? [])
      .filter(
        (a): a is { name: string; browser_download_url: string } =>
          typeof a?.name === "string" && typeof a?.browser_download_url === "string"
      )
      .map((a) => ({ name: a.name, url: a.browser_download_url }));
    return { tag: data.tag_name ?? null, assets };
  } catch {
    return null;
  }
}

/**
 * Resolve the latest-release download URL for `repoUrl` + `os`, or null when the
 * repo isn't GitHub, has no release, or exposes no matching asset. Cached per repo.
 */
export async function resolveLatestAsset(
  repoUrl: string,
  os: AppDownloadOs
): Promise<string | null> {
  const coords = parseGithubUrl(repoUrl);
  if (!coords?.repo) return null;

  const key = `gh:rel:${coords.owner}/${coords.repo}`;
  let rel = await cacheGet(key);
  if (rel === undefined) {
    const fetched = await fetchLatestRelease(coords.owner, coords.repo);
    rel = fetched ?? { tag: null, assets: [] };
    await cacheSet(key, rel, rel.assets.length ? CACHE_TTL_SECONDS : NEG_CACHE_TTL_SECONDS);
  }

  const asset = pickAssetForOs(rel.assets, os);
  return asset?.url ?? null;
}
