import { describe, it, expect } from "vitest";
import { slugify, mapAppRow, mapAppDetail, type AppRow } from "../../server/lib/apps.js";
import { sanitizeAppContent } from "../../server/lib/appContent.js";

const ROW: AppRow = {
  id: "app_1",
  slug: "myjournal",
  name: "myJournal",
  tagline: "A journal",
  repo_url: "https://github.com/x/myjournal",
  stack: "Tauri",
  description: "desc",
  icon_url: null,
  uses_sharedcorelib: true,
  support_status: "requested",
  listed: false,
  owner_user_id: "owner_9",
};

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("My Cool App")).toBe("my-cool-app");
  });

  it("strips leading/trailing separators and collapses runs", () => {
    expect(slugify("  --Hello, World!!  ")).toBe("hello-world");
  });

  it("caps length at 48 chars", () => {
    expect(slugify("a".repeat(100)).length).toBe(48);
  });
});

describe("mapAppRow", () => {
  it("maps snake_case row fields to the camelCase listing", () => {
    const out = mapAppRow(ROW, "owner_9");
    expect(out).toMatchObject({
      id: "app_1",
      repoUrl: "https://github.com/x/myjournal",
      usesSharedCoreLib: true,
      supportStatus: "requested",
      isOwner: true,
    });
  });

  it("marks isOwner false for a different viewer or anonymous", () => {
    expect(mapAppRow(ROW, "someone_else").isOwner).toBe(false);
    expect(mapAppRow(ROW, null).isOwner).toBe(false);
  });

  it("falls back to 'none' for an unrecognised support status", () => {
    const out = mapAppRow({ ...ROW, support_status: "garbage" }, null);
    expect(out.supportStatus).toBe("none");
  });
});

describe("mapAppDetail", () => {
  it("includes the content payload on the detail mapping", () => {
    const out = mapAppDetail({ ...ROW, content: { heroTagline: "hi" } }, null);
    expect(out.content).toEqual({ heroTagline: "hi" });
  });

  it("defaults content to null when the row has none", () => {
    expect(mapAppDetail(ROW, null).content).toBeNull();
  });
});

describe("sanitizeAppContent", () => {
  it("keeps valid fields and drops empties", () => {
    const out = sanitizeAppContent({
      heroTagline: "  Private finance  ",
      features: [{ icon: "📊", title: "Net worth", body: "Track it" }, { title: "", body: "x" }],
      demo: { videoUrl: "https://ex.com/d.mp4", caption: "demo" },
      downloads: [{ os: "windows", label: "Win", url: "https://ex.com/a.msi" }],
    });
    expect(out?.heroTagline).toBe("Private finance");
    expect(out?.features).toHaveLength(1);
    expect(out?.demo?.videoUrl).toBe("https://ex.com/d.mp4");
    expect(out?.downloads).toHaveLength(1);
  });

  it("rejects unsafe URLs and unknown platforms", () => {
    const out = sanitizeAppContent({
      demo: { videoUrl: "javascript:alert(1)" },
      downloads: [
        { os: "windows", label: "x", url: "data:text/html,evil" },
        { os: "solaris", label: "y", url: "https://ex.com/z" },
      ],
    });
    expect(out).toBeNull();
  });

  it("returns null for non-objects and empty content", () => {
    expect(sanitizeAppContent(null)).toBeNull();
    expect(sanitizeAppContent("nope")).toBeNull();
    expect(sanitizeAppContent({ features: [] })).toBeNull();
  });
});
