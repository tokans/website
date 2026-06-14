/**
 * Mock backend adapter (default until `tokans/backend` exists).
 *
 * Implements {@link BackendPort} against the website's own Neon database so the
 * P0 flows ("website calls one backend endpoint end-to-end") work today. When the
 * backend REST API lands, switch BACKEND_MODE=rest and this is bypassed — the
 * contract is identical, so callers don't change.
 *
 * P0 simplification: professional onboarding auto-approves (status="approved").
 * The real human/automated approval workflow is BE P1; this seam doesn't change.
 */
import { randomUUID } from "crypto";
import { getDb } from "../db.js";
import { type AppRow, mapAppRow } from "../apps.js";
import { parseSkills } from "../partners.js";
import { mintIdentityToken, type Identity } from "./identity.js";
import type {
  AppListing,
  Auth,
  BackendPort,
  DownloadGrant,
  NewTaskInput,
  NewTaskResult,
  ProfessionalOnboardInput,
  ProfessionalStatus,
  ProfessionalStatusKind,
  RoleCategory,
} from "./contract.js";

interface ProfileRow {
  profession: string;
  role_name: string;
  role_category: string;
  sub_type: string | null;
  status: string;
  download_granted_at: string | null;
}

const STATUS_VALUES: readonly ProfessionalStatusKind[] = ["none", "pending", "approved"];

function downloadBase(): string {
  return (
    process.env["MWA_DOWNLOAD_BASE"] ??
    "https://github.com/tokans/myworkassistant/releases/latest"
  );
}

const EMPTY_STATUS: ProfessionalStatus = {
  onboarded: false,
  profession: null,
  roleName: null,
  category: null,
  subType: null,
  status: "none",
  subscribed: false,
  downloadEligible: false,
};

export class MockBackend implements BackendPort {
  async onboardProfessional(
    identity: Identity,
    input: ProfessionalOnboardInput
  ): Promise<ProfessionalStatus> {
    const sql = getDb();
    const answersJson = JSON.stringify(input.answers ?? {});
    const subType = input.subType ?? null;

    // Rich professional record (drives status + download gate + future partner listing).
    await sql`
      INSERT INTO professional_profiles
        (user_id, profession, role_name, role_category, sub_type, answers, status, download_granted_at)
      VALUES
        (${identity.userId}, ${input.profession}, ${input.roleName}, ${input.category},
         ${subType}, ${answersJson}, 'approved', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        profession          = EXCLUDED.profession,
        role_name           = EXCLUDED.role_name,
        role_category       = EXCLUDED.role_category,
        sub_type            = EXCLUDED.sub_type,
        answers             = EXCLUDED.answers,
        status              = 'approved',
        download_granted_at = COALESCE(professional_profiles.download_granted_at, NOW()),
        updated_at          = NOW()
    `;

    // Reflect the grant in the existing role system (role TEXT; 'partner' = UAM RoleCategory).
    await sql`
      INSERT INTO user_roles (user_id, role, sub_type, is_verified, verified_at)
      VALUES (${identity.userId}, 'partner', ${subType}, TRUE, NOW())
      ON CONFLICT (user_id, role) DO UPDATE SET
        sub_type    = EXCLUDED.sub_type,
        is_verified = TRUE,
        verified_at = NOW()
    `;

    // Publish the partner listing (the "ad" — also fed to other suite apps).
    const skills = parseSkills((input.answers as Record<string, unknown>)["skills"]);
    await sql`
      INSERT INTO partner_listings (professional_user_id, profession, skills, role_category, visible)
      VALUES (${identity.userId}, ${input.profession}, ${JSON.stringify(skills)}::jsonb, ${input.category}, TRUE)
      ON CONFLICT (professional_user_id) DO UPDATE SET
        profession    = EXCLUDED.profession,
        skills        = EXCLUDED.skills,
        role_category = EXCLUDED.role_category,
        visible       = TRUE,
        updated_at    = NOW()
    `;

    return this.getProfessionalStatus(identity);
  }

  async createWorkItem(_identity: Identity, _input: NewTaskInput): Promise<NewTaskResult> {
    // Mock: the real backend creates a WorkItem (NewTask) and routes it to the
    // professional's inbox via the WorkflowService. Here we just mint an id.
    return { workItemId: `wf_conn_${randomUUID()}`, status: "open" };
  }

  private async hasActiveSubscription(userId: string): Promise<boolean> {
    const sql = getDb();
    const rows = (await sql`
      SELECT 1 AS ok FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
      LIMIT 1
    `) as { ok: number }[];
    return rows.length > 0;
  }

  async getProfessionalStatus(identity: Identity): Promise<ProfessionalStatus> {
    const sql = getDb();
    const rows = (await sql`
      SELECT profession, role_name, role_category, sub_type, status, download_granted_at
      FROM professional_profiles
      WHERE user_id = ${identity.userId}
      LIMIT 1
    `) as ProfileRow[];

    const subscribed = await this.hasActiveSubscription(identity.userId);
    const row = rows[0];
    if (!row) return { ...EMPTY_STATUS, subscribed };

    const status: ProfessionalStatusKind = STATUS_VALUES.includes(
      row.status as ProfessionalStatusKind
    )
      ? (row.status as ProfessionalStatusKind)
      : "pending";

    return {
      onboarded: true,
      profession: row.profession,
      roleName: row.role_name,
      category: row.role_category as RoleCategory,
      subType: row.sub_type,
      status,
      subscribed,
      // Access to myWorkAssistant requires both approval AND an active subscription.
      downloadEligible: status === "approved" && subscribed,
    };
  }

  async grantDownload(identity: Identity): Promise<DownloadGrant> {
    const st = await this.getProfessionalStatus(identity);
    if (!st.downloadEligible) {
      const reason = !st.onboarded
        ? "Complete professional onboarding to unlock the download."
        : st.status !== "approved"
          ? "Your professional application is pending approval."
          : "Subscribe to unlock the download.";
      return { eligible: false, url: null, token: null, reason };
    }
    // P0 stub: a 10-minute grant token + a gated link into the tokans release space.
    // BE later replaces this with a properly-signed, single-use download grant.
    return {
      eligible: true,
      url: downloadBase(),
      token: mintIdentityToken(identity, 600),
      reason: null,
    };
  }

  async requestAppSupport(identity: Identity, appId: string): Promise<AppListing> {
    const sql = getDb();
    // Ownership is verified by the caller (endpoint). P0 sets status 'requested';
    // the real review/approve → listed workflow is BE Workflow.NewTask (TODO later).
    const rows = (await sql`
      UPDATE apps SET support_status = 'requested', updated_at = NOW()
      WHERE id = ${appId}
      RETURNING id, slug, name, tagline, repo_url, stack, description,
                icon_url, site_url, uses_sharedcorelib, support_status, listed, owner_user_id
    `) as AppRow[];
    const row = rows[0];
    if (!row) throw new Error("App not found");
    return mapAppRow(row, identity.userId);
  }

  async resolveAuth(identity: Identity, schemaId: string): Promise<Auth> {
    const st = await this.getProfessionalStatus(identity);
    const partner = st.category === "Partner" && st.status === "approved";
    return {
      userId: identity.userId,
      schemaId,
      read: true,
      create: partner,
      update: partner,
      deactivate: false,
      reactivate: false,
      upload: partner,
      download: partner,
      print: true,
      share: partner,
      accessLevel: "Self",
      fields: [],
      filters: {},
    };
  }
}
