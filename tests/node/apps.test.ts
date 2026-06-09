import { describe, it, expect } from "vitest";
import { slugify, mapAppRow, type AppRow } from "../../server/lib/apps.js";

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
