# App README template (Tokans /apps listing)

Every app in the Tokans support directory (`/apps`) shows a **tagline** and a
**description**. Both are parsed from the app's `README.md` at seed time — there
is no separate metadata file. To get a good listing, an app's README only has to
open in a predictable shape; the rest of the README can be anything.

## The shape

```markdown
# <Display name>

> One punchy sentence describing the app — this becomes the tagline.

A short paragraph (1–3 sentences) saying what the app is and what it does for
the user. This becomes the description shown on the directory card.

## <first real section — Features, Stack, etc.>
...
```

## Rules (how the parser reads it)

The "lead" is everything between the `# ` H1 and the first `## ` heading.

- **tagline** = the first sentence of the `>` blockquote if present, otherwise
  the first sentence of the lead paragraph.
- **description** = the blockquote when it's a rich, multi-sentence summary;
  otherwise the lead paragraph (falling back to the blockquote).
- Markdown (links, emphasis, code, images) is stripped and whitespace collapsed.
- Badge / bare-image / raw-HTML lines at the top of the lead are ignored.

So both of these work without any extra ceremony:

- **Blockquote tagline + prose description** (preferred when the one-liner and
  the explanation differ).
- **Just a lead paragraph** (its first sentence becomes the tagline, the whole
  paragraph the description).

## Validate before you push

```bash
node scripts/validate-app-readme.mjs            # this app (./README.md)
node scripts/validate-app-readme.mjs ../myHealth # another app dir
```

It exits non-zero if a usable tagline (≥ 10 chars) and description (≥ 30 chars)
can't be derived. Wire it into the app's CI as a plain node step (it has no
dependencies) — see the header of `scripts/validate-app-readme.mjs` for how to
drop it into another app's repo.
