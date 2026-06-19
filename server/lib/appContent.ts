/**
 * Sanitiser for owner-supplied app detail-page content (AppContent).
 *
 * The /list-app onboarding form lets app owners author what renders natively at
 * /apps/<slug>. That content is untrusted input persisted to apps.content and
 * later injected into the page, so we keep only known keys, enforce shapes, cap
 * sizes, and allow only https URLs (no javascript:/data:/http: vectors). The
 * client island additionally escapes every value at render time; this is the
 * server-side belt to the island's braces.
 */
import type {
  AppContent,
  AppDownload,
  AppDownloadOs,
  AppFeature,
  AppScreenshot,
} from "./backend/contract.js";

const MAX_FEATURES = 24;
const MAX_DOWNLOADS = 12;
const MAX_SHOTS = 12;
const OSES: readonly AppDownloadOs[] = ["windows", "macos", "linux"];

/** Trim + length-cap a string; returns null when empty. */
function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

/** Allow only http(s) URLs (https strongly preferred); null otherwise. */
function url(v: unknown): string | null {
  const s = str(v, 2048);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? s : null;
  } catch {
    return null;
  }
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function feature(v: unknown): AppFeature | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = str(o["title"], 120);
  const body = str(o["body"], 400);
  if (!title || !body) return null;
  const icon = str(o["icon"], 8);
  return icon ? { icon, title, body } : { title, body };
}

function download(v: unknown): AppDownload | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const os = o["os"];
  const link = url(o["url"]);
  if (typeof os !== "string" || !OSES.includes(os as AppDownloadOs) || !link) return null;
  const label = str(o["label"], 80) ?? os;
  const arch = str(o["arch"], 24);
  return arch ? { os: os as AppDownloadOs, arch, label, url: link } : { os: os as AppDownloadOs, label, url: link };
}

function screenshot(v: unknown): AppScreenshot | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const link = url(o["url"]);
  if (!link) return null;
  const caption = str(o["caption"], 160);
  return caption ? { url: link, caption } : { url: link };
}

/**
 * Validate + clean an AppContent payload. Returns null when nothing usable is
 * left (so the column stays NULL rather than `{}`).
 */
export function sanitizeAppContent(input: unknown): AppContent | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const out: AppContent = {};

  const heroTagline = str(o["heroTagline"], 240);
  if (heroTagline) out.heroTagline = heroTagline;

  const features = asArray(o["features"]).map(feature).filter((f): f is AppFeature => f !== null).slice(0, MAX_FEATURES);
  if (features.length) out.features = features;

  const demoObj = o["demo"] as Record<string, unknown> | null | undefined;
  const demoUrl = demoObj ? url(demoObj["videoUrl"]) : null;
  if (demoUrl) {
    const caption = str(demoObj!["caption"], 160);
    out.demo = caption ? { videoUrl: demoUrl, caption } : { videoUrl: demoUrl };
  }

  const downloads = asArray(o["downloads"]).map(download).filter((d): d is AppDownload => d !== null).slice(0, MAX_DOWNLOADS);
  if (downloads.length) out.downloads = downloads;

  const shots = asArray(o["screenshots"]).map(screenshot).filter((s): s is AppScreenshot => s !== null).slice(0, MAX_SHOTS);
  if (shots.length) out.screenshots = shots;

  const noteObj = o["privacyNote"] as Record<string, unknown> | null | undefined;
  const noteTitle = noteObj ? str(noteObj["title"], 120) : null;
  if (noteTitle) {
    out.privacyNote = { title: noteTitle, body: str(noteObj!["body"], 400) ?? "" };
  }

  return Object.keys(out).length ? out : null;
}
