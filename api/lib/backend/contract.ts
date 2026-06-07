/**
 * Backend service contract (P0 slice).
 *
 * The typed shape of the gRPC service `tokans/backend` exposes, mirroring the
 * hyperclaw `uam` schema (RoleCategory, AccessLevel, the 9-boolean Auth). For
 * P0 only the slice the website needs is modelled; it grows as BE phases land.
 *
 * Both adapters implement {@link BackendPort}: `MockBackend` (Neon-backed, the
 * default until BE exists) and `GrpcBackend` (the real wire, stubbed for now).
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
  /** True only when the professional may download the gated desktop app. */
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
}

/** Thrown by the gRPC adapter until `tokans/backend` (BE P0) is wired. */
export class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}
