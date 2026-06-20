/**
 * Backend service contract (P0 slice).
 *
 * The typed shape the website needs from `tokans/backend`, mirroring the
 * `uam` schema (RoleCategory, AccessLevel, the 9-boolean Auth). For P0 only the
 * slice the website needs is modelled; it grows as BE phases land.
 *
 * The web tier reaches the backend over **REST** (gRPC is the desktop↔backend
 * transport only). Both adapters implement {@link BackendPort}: `MockBackend`
 * (Neon-backed, the default until BE exists) and `RestBackend` (HTTP to the backend).
 */
import type { Identity } from "./identity.js";

export type { Identity } from "./identity.js";

// ── UAM enums (from 03_uam.yaml) ──────────────────────────────────────────────
export type RoleCategory =
  | "Customer"
  | "Employee"
  | "Partner"
  | "Contractor"
  | "Automaton";

export type AccessLevel =
  | "Self"
  | "Delegated"
  | "Team"
  | "Reportee"
  | "Category";

/** Resolved effective permission for (userId, schemaId) — the 9 WorkType booleans. */
export interface Auth {
  userId: string;
  schemaId: string;
  read: boolean;
  create: boolean;
  update: boolean;
  deactivate: boolean;
  reactivate: boolean;
  upload: boolean;
  download: boolean;
  print: boolean;
  share: boolean;
  accessLevel: AccessLevel;
  /** If non-empty, only these schema fields are visible. */
  fields: string[];
  filters: Record<string, string>;
}

// ── Professional onboarding (consideration 1 + 4) ─────────────────────────────
export type ProfessionalStatusKind = "none" | "pending" | "approved";

export interface ProfessionalStatus {
  onboarded: boolean;
  profession: string | null;
  roleName: string | null;
  category: RoleCategory | null;
  subType: string | null;
  status: ProfessionalStatusKind;
  /** Whether the professional has an active subscription. */
  subscribed: boolean;
  /** True only when approved AND subscribed — gates the desktop-app download. */
  downloadEligible: boolean;
}

export interface ProfessionalOnboardInput {
  profession: string;
  /** UAM Role.roleName derived from the profession (e.g. partner.software_engineer). */
  roleName: string;
  category: RoleCategory;
  subType?: string | null;
  answers: Record<string, unknown>;
}

/** Result of the download gate. */
export interface DownloadGrant {
  eligible: boolean;
  url: string | null;
  /** Short-lived grant token (placeholder until BE issues a signed grant). */
  token: string | null;
  reason: string | null;
}

// ── Apps support directory (P1) ───────────────────────────────────────────────
export type AppSupportStatus = "none" | "requested" | "accepted" | "listed";

/** Target OS for a download asset. */
export type AppDownloadOs = "windows" | "macos" | "linux" | "android";

export interface AppDownload {
  os: AppDownloadOs;
  /** Optional architecture qualifier, e.g. "x64", "arm64". */
  arch?: string | null;
  /** Button/row label, e.g. "Windows (.msi)". */
  label: string;
  /** Direct URL to the installer for this platform. */
  url: string;
}

export interface AppFeature {
  /** Optional emoji/icon shown on the feature card. */
  icon?: string | null;
  title: string;
  body: string;
}

export interface AppScreenshot {
  url: string;
  caption?: string | null;
}

/**
 * Rich, per-app detail-page content rendered natively on tokans.org at
 * /apps/<slug>. Stored as the `apps.content` JSONB column; only the detail
 * endpoint returns it (the directory listing stays lean). All fields optional
 * so a sparsely-listed app still renders.
 */
export interface AppContent {
  /** Longer hero subtitle; falls back to `tagline` when absent. */
  heroTagline?: string | null;
  features?: AppFeature[];
  demo?: { videoUrl: string; caption?: string | null } | null;
  downloads?: AppDownload[];
  screenshots?: AppScreenshot[];
  privacyNote?: { title: string; body: string } | null;
}

export interface AppListing {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  repoUrl: string | null;
  stack: string | null;
  description: string | null;
  /** Site-relative path to the app's icon, e.g. /app-icons/myfinance.png. */
  iconUrl: string | null;
  usesSharedCoreLib: boolean;
  supportStatus: AppSupportStatus;
  siteUrl: string | null;
  listed: boolean;
  /** True if the requesting user owns this app. */
  isOwner: boolean;
  /**
   * Detail-page content. Present only on the single-app detail response
   * (GET /api/apps/<id-or-slug>); omitted from directory listings.
   */
  content?: AppContent | null;
}

// ── Partner directory + connections (P1) ──────────────────────────────────────
export interface PartnerListing {
  id: string;
  professionalUserId: string;
  name: string | null;
  headline: string | null;
  profession: string | null;
  skills: string[];
  roleCategory: string;
}

export interface NewTaskInput {
  professionalUserId: string;
  requesterUserId: string;
  message: string;
  kind: string;
}

export interface NewTaskResult {
  workItemId: string;
  status: string;
}

// ── The service the edge talks to ─────────────────────────────────────────────
export interface BackendPort {
  /** Resolve the effective Auth for a schema (UAM authority, reflected by the client). */
  resolveAuth(identity: Identity, schemaId: string): Promise<Auth>;
  /** Profile a professional, assign their Partner role, gate the download. */
  onboardProfessional(
    identity: Identity,
    input: ProfessionalOnboardInput
  ): Promise<ProfessionalStatus>;
  getProfessionalStatus(identity: Identity): Promise<ProfessionalStatus>;
  /** Issue (or deny) a gated download grant for the desktop app. */
  grantDownload(identity: Identity): Promise<DownloadGrant>;
  /** Owner requests their app be accepted for Tokans support (→ acceptance workflow). */
  requestAppSupport(identity: Identity, appId: string): Promise<AppListing>;
  /** Create a workflow work item (NewTask) routed to a professional's inbox. */
  createWorkItem(identity: Identity, input: NewTaskInput): Promise<NewTaskResult>;
}

/** Thrown by the REST adapter when the backend REST API isn't configured/reachable. */
export class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}
