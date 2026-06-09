import { describe, it, expect } from "vitest";
import { SEED_PROFILES, getSeedProfile } from "../../server/lib/seedProfiles.js";

describe("seed profiles", () => {
  it("ships a non-empty library with unique ids", () => {
    expect(SEED_PROFILES.length).toBeGreaterThan(0);
    const ids = SEED_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every profile has a headline, skills and claims", () => {
    for (const p of SEED_PROFILES) {
      expect(p.headline).toBeTruthy();
      expect(p.skills.length).toBeGreaterThan(0);
      expect(p.claims.length).toBeGreaterThan(0);
    }
  });

  it("looks up a profile by id", () => {
    const first = SEED_PROFILES[0]!;
    expect(getSeedProfile(first.id)).toBe(first);
  });

  it("returns null for an unknown id", () => {
    expect(getSeedProfile("sp_nope")).toBeNull();
  });
});
