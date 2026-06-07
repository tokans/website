import { describe, it, expect } from "vitest";
import { parseSkills, mapPartnerRow, type PartnerRow } from "../../api/lib/partners.js";

describe("parseSkills", () => {
  it("splits, trims and drops empties", () => {
    expect(parseSkills("Go,  PostgreSQL ,, gRPC")).toEqual(["Go", "PostgreSQL", "gRPC"]);
  });

  it("returns [] for non-string input", () => {
    expect(parseSkills(undefined)).toEqual([]);
    expect(parseSkills(42)).toEqual([]);
    expect(parseSkills(["already", "array"])).toEqual([]);
  });

  it("caps the list at 12 entries", () => {
    const many = Array.from({ length: 20 }, (_, i) => `s${i}`).join(",");
    expect(parseSkills(many)).toHaveLength(12);
  });
});

describe("mapPartnerRow", () => {
  const base: PartnerRow = {
    id: "p1",
    professional_user_id: "u1",
    name: "Ada",
    headline: "Backend",
    profession: "backend_engineer",
    skills: ["Go", "SQL"],
    role_category: "Partner",
  };

  it("maps a row with an array skills column", () => {
    expect(mapPartnerRow(base)).toEqual({
      id: "p1",
      professionalUserId: "u1",
      name: "Ada",
      headline: "Backend",
      profession: "backend_engineer",
      skills: ["Go", "SQL"],
      roleCategory: "Partner",
    });
  });

  it("coerces a non-array skills column to []", () => {
    expect(mapPartnerRow({ ...base, skills: null }).skills).toEqual([]);
    expect(mapPartnerRow({ ...base, skills: "Go,SQL" }).skills).toEqual([]);
  });
});
