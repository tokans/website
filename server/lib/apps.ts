/**
 * Apps support-directory row mapping (P1). The `apps` table is a public
 * projection; the authoritative acceptance workflow lives in the backend
 * (BE Workflow.NewTask) — see server/lib/backend + docs/BUILD-PLAN.md §2.1.
 */
import type { AppListing, AppSupportStatus } from "./backend/contract.js";

export interface AppRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  repo_url: string | null;
  stack: string | null;
  description: string | null;
  icon_url: string | null;
  site_url: string | null;
  uses_sharedcorelib: boolean;
  support_status: string;
  listed: boolean;
  owner_user_id: string | null;
}

const STATUSES: readonly AppSupportStatus[] = ["none", "requested", "accepted", "listed"];

export function mapAppRow(row: AppRow, viewerUserId: string | null): AppListing {
  const supportStatus: AppSupportStatus = STATUSES.includes(
    row.support_status as AppSupportStatus
  )
    ? (row.support_status as AppSupportStatus)
    : "none";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    repoUrl: row.repo_url,
    stack: row.stack,
    description: row.description,
    iconUrl: row.icon_url,
    siteUrl: row.site_url,
    usesSharedCoreLib: row.uses_sharedcorelib,
    supportStatus,
    listed: row.listed,
    isOwner: viewerUserId != null && row.owner_user_id === viewerUserId,
  };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
