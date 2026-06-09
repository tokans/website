import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeFakeSql, type FakeSql } from "./helpers.js";

// Hoisted holder so the vi.mock factory and the tests share one mutable sql ref.
const h = vi.hoisted(() => ({ sql: null as FakeSql | null }));
vi.mock("../../server/lib/db.js", () => ({ getDb: () => h.sql }));

import { MockBackend } from "../../server/lib/backend/mock.js";
import type { Identity } from "../../server/lib/backend/identity.js";

const ID: Identity = { userId: "u1", email: "a@b.c", name: "Ada", roles: [] };

function profileRow(over: Record<string, unknown> = {}) {
  return {
    profession: "backend_engineer",
    role_name: "partner.backend_engineer",
    role_category: "Partner",
    sub_type: null,
    status: "approved",
    download_granted_at: "2026-01-01",
    ...over,
  };
}

describe("MockBackend.onboardProfessional", () => {
  beforeEach(() => {
    // 3 writes (profile, role, listing) then status read (profile + subscription).
    h.sql = makeFakeSql([[], [], [], [profileRow()], [{ ok: 1 }]]);
  });

  it("persists the profile and returns approved+subscribed status", async () => {
    const be = new MockBackend();
    const status = await be.onboardProfessional(ID, {
      profession: "backend_engineer",
      roleName: "partner.backend_engineer",
      category: "Partner",
      answers: { skills: "Go, SQL" },
    });
    expect(status.onboarded).toBe(true);
    expect(status.status).toBe("approved");
    expect(status.subscribed).toBe(true);
    expect(status.downloadEligible).toBe(true);
  });

  it("writes to professional_profiles, user_roles and partner_listings", async () => {
    const be = new MockBackend();
    await be.onboardProfessional(ID, {
      profession: "backend_engineer",
      roleName: "partner.backend_engineer",
      category: "Partner",
      answers: { skills: "Go, SQL, Kafka" },
    });
    const text = h.sql!.calls.map((c) => c.text).join("\n");
    expect(text).toMatch(/INSERT INTO professional_profiles/);
    expect(text).toMatch(/INSERT INTO user_roles/);
    expect(text).toMatch(/INSERT INTO partner_listings/);
  });
});

describe("MockBackend.getProfessionalStatus", () => {
  it("returns the empty status when no profile row exists", async () => {
    h.sql = makeFakeSql([[], []]); // no profile, no subscription
    const status = await new MockBackend().getProfessionalStatus(ID);
    expect(status.onboarded).toBe(false);
    expect(status.status).toBe("none");
    expect(status.downloadEligible).toBe(false);
  });

  it("is not download-eligible when approved but unsubscribed", async () => {
    h.sql = makeFakeSql([[profileRow()], []]); // profile approved, no active sub
    const status = await new MockBackend().getProfessionalStatus(ID);
    expect(status.status).toBe("approved");
    expect(status.subscribed).toBe(false);
    expect(status.downloadEligible).toBe(false);
  });
});

describe("MockBackend.grantDownload gate", () => {
  it("denies + explains when onboarding is incomplete", async () => {
    h.sql = makeFakeSql([[], []]);
    const grant = await new MockBackend().grantDownload(ID);
    expect(grant.eligible).toBe(false);
    expect(grant.url).toBeNull();
    expect(grant.reason).toMatch(/onboarding/i);
  });

  it("denies + asks to subscribe when approved but unsubscribed", async () => {
    h.sql = makeFakeSql([[profileRow()], []]);
    const grant = await new MockBackend().grantDownload(ID);
    expect(grant.eligible).toBe(false);
    expect(grant.reason).toMatch(/subscribe/i);
  });

  it("issues a url + token when approved and subscribed", async () => {
    h.sql = makeFakeSql([[profileRow()], [{ ok: 1 }]]);
    const grant = await new MockBackend().grantDownload(ID);
    expect(grant.eligible).toBe(true);
    expect(grant.url).toBeTruthy();
    expect(grant.token).toBeTruthy();
    expect(grant.reason).toBeNull();
  });
});

describe("MockBackend.createWorkItem", () => {
  it("mints an open work-item id (no DB needed)", async () => {
    h.sql = makeFakeSql();
    const r = await new MockBackend().createWorkItem(ID, {
      professionalUserId: "p1",
      requesterUserId: "u1",
      message: "hello",
      kind: "connection",
    });
    expect(r.status).toBe("open");
    expect(r.workItemId).toMatch(/^wf_conn_/);
  });
});

describe("MockBackend.resolveAuth", () => {
  it("grants partner write perms only when approved Partner", async () => {
    h.sql = makeFakeSql([[profileRow()], [{ ok: 1 }]]);
    const auth = await new MockBackend().resolveAuth(ID, "schema.x");
    expect(auth.create).toBe(true);
    expect(auth.download).toBe(true);
    expect(auth.deactivate).toBe(false);
  });

  it("withholds write perms when not onboarded", async () => {
    h.sql = makeFakeSql([[], []]);
    const auth = await new MockBackend().resolveAuth(ID, "schema.x");
    expect(auth.read).toBe(true);
    expect(auth.create).toBe(false);
  });
});
