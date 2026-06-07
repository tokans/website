import { describe, it, expect } from "vitest";
import {
  PROFESSIONS,
  isKnownProfession,
  professionToRole,
} from "../../api/lib/professions.js";

describe("professions catalogue", () => {
  it("recognises a catalogued profession", () => {
    expect(isKnownProfession("software_engineer")).toBe(true);
    expect(isKnownProfession("designer")).toBe(true);
  });

  it("rejects an unknown profession", () => {
    expect(isKnownProfession("astronaut")).toBe(false);
    expect(isKnownProfession("")).toBe(false);
  });

  it("maps every profession to a Partner UAM role", () => {
    for (const p of PROFESSIONS) {
      const role = professionToRole(p.id);
      expect(role.category).toBe("Partner");
      expect(role.roleName).toBe(`partner.${p.id}`);
    }
  });
});
