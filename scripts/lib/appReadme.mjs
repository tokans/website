/**
 * Extract a directory listing (tagline + description) from an app's README.
 *
 * This is the single source of truth shared by the seeder (scripts/seed-apps.mjs)
 * and the validator (scripts/validate-app-readme.mjs) so the two can never drift.
 *
 * README convention (the "template" — see docs/app-readme-template.md):
 *
 *     # <Display name>
 *
 *     > One punchy sentence — the tagline.        (optional `>` blockquote)
 *
 *     A short paragraph saying what the app is and does — the description.
 *
 *     ## ...                                       (the lead ends at the first H2)
 *
 * Extraction rules (deliberately forgiving, to fit the READMEs we already have):
 *   - The "lead" is everything between the H1 and the first H2 (`## `).
 *   - tagline      = first sentence of the blockquote if present, else the
 *                    first sentence of the first prose paragraph.
 *   - description  = the blockquote when it is a rich (multi-sentence) summary,
 *                    otherwise the first prose paragraph (falling back to the
 *                    blockquote if there is no paragraph).
 *   - Markdown (links, emphasis, code, images) is stripped; whitespace collapsed.
 * Either field may come back null if the README simply doesn't supply it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TAGLINE_MAX = 160;
const DESCRIPTION_MAX = 600;

function stripMarkdown(s) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/`+/g, "") // inline code ticks
    .replace(/\*\*|__/g, "") // bold
    .replace(/(^|[\s(])[*_]([^*_]+)[*_]/g, "$1$2") // italics
    .replace(/\s+/g, " ") // collapse all whitespace (incl. newlines)
    .trim();
}

function firstSentence(s) {
  const m = s.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : s).trim();
}

function sentenceCount(s) {
  return (s.match(/[.!?](?=\s|$)/g) ?? []).length;
}

function clamp(s, max) {
  if (!s || s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "").trimEnd() + "…";
}

export function parseAppReadme(text) {
  if (!text || typeof text !== "string") return { tagline: null, description: null };
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  // Advance to the H1, then start the lead after it. (Tolerate a missing H1.)
  let i = 0;
  while (i < lines.length && !/^#\s+/.test(lines[i])) i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) i++;

  // The lead ends at the first H2.
  const lead = [];
  for (; i < lines.length && !/^##\s+/.test(lines[i]); i++) lead.push(lines[i]);

  // Group the lead into the first blockquote block and the first prose paragraph.
  let blockquote = null;
  let paragraph = null;
  let buf = [];
  let bufIsQuote = false;

  const flush = () => {
    if (buf.length === 0) return;
    const text = stripMarkdown(buf.join(" "));
    if (bufIsQuote) {
      if (blockquote == null && text) blockquote = text;
    } else if (paragraph == null && text) {
      paragraph = text;
    }
    buf = [];
  };

  for (const raw of lead) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
      continue;
    }
    const isQuote = /^\s*>/.test(line);
    // Skip badge / bare-image / HTML lines when they would start a paragraph.
    if (!isQuote && buf.length === 0 && /^\s*(\[!\[|!\[|<)/.test(line)) continue;

    const cleaned = isQuote ? line.replace(/^\s*>\s?/, "") : line;
    if (buf.length === 0) bufIsQuote = isQuote;
    else if (isQuote !== bufIsQuote) {
      flush();
      bufIsQuote = isQuote;
    }
    buf.push(cleaned);

    if (blockquote != null && paragraph != null) break;
  }
  flush();

  const tagline = blockquote
    ? firstSentence(blockquote)
    : paragraph
      ? firstSentence(paragraph)
      : null;

  // A multi-sentence blockquote IS the summary (e.g. myDemo); a one-liner
  // blockquote is just a tagline, so the prose paragraph is the description.
  const description =
    blockquote && sentenceCount(blockquote) >= 2
      ? blockquote
      : paragraph || blockquote || null;

  return {
    tagline: tagline ? clamp(tagline, TAGLINE_MAX) : null,
    description: description ? clamp(description, DESCRIPTION_MAX) : null,
  };
}

/** Locate an app's README (case-insensitive) inside `dir`, or null. */
export function findReadme(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const name =
    entries.find((f) => f.toLowerCase() === "readme.md") ??
    entries.find((f) => /^readme(\.|$)/i.test(f));
  if (!name) return null;
  const p = join(dir, name);
  try {
    return statSync(p).isFile() ? p : null;
  } catch {
    return null;
  }
}

/** Read + parse an app's README purpose from its directory. */
export function readAppPurpose(dir) {
  const readmePath = findReadme(dir);
  if (!readmePath) return { tagline: null, description: null, readmePath: null };
  return { ...parseAppReadme(readFileSync(readmePath, "utf8")), readmePath };
}
