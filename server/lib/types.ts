// ─── Domain types shared across lib, api routes, and frontend ────────────────

export type RoleId =
  | "opportunity_seeker"
  | "builder"
  | "employer"
  | "mentor"
  | "donor"
  | "angel";

export type OppSubType =
  | "Software Development Engineer (SDE)"
  | "Engineering Manager (EM / SDM)"
  | "Product Manager"
  | "Designer (UI/UX)"
  | "Data Scientist / ML Engineer"
  | "DevOps / Platform / SRE"
  | "QA / SDET"
  | "Marketing Professional"
  | "Business Analyst"
  | "Other";

export type BuilderSubType = "idea_stage" | "vibe_founder" | "service_provider_company";

export type EmployerSubType = "startup_sme" | "enterprise";

export type SubType = OppSubType | BuilderSubType | EmployerSubType | string;

// ── Database row shapes ────────────────────────────────────────────────────────
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  github_id: string | null;
  github_url: string | null;
  google_id: string | null;
  avatar_url: string | null;
  website_url: string | null;
  is_verified: boolean;
  is_gaming_flagged: boolean;
  created_at: string;
  /** Joined field from onboarding_data existence check */
  onboarding_complete?: boolean;
}

export interface DbOnboardingData {
  id: string;
  user_id: string;
  role: RoleId;
  sub_type: SubType | null;
  context: Record<string, unknown>;
  completed_at: string;
}

// ── Session payload stored in Redis ───────────────────────────────────────────
export interface SessionPayload {
  userId: string;
  name: string | null;
  email: string;
  onboardingComplete: boolean;
  role?: RoleId;
  subType?: SubType | null;
  /** Entry paths whose onboarding journey this user has completed (run once each). */
  completedJourneys?: string[];
  /** True once the user clicks the signup confirmation link. OAuth users start as true. */
  emailVerified?: boolean;
}

export interface SessionWithId extends SessionPayload {
  sessionId: string;
}

// ── API response shapes ────────────────────────────────────────────────────────
export interface UserPublic {
  id: string;
  name: string | null;
  email: string;
}

export interface AuthResponse {
  user: UserPublic;
  onboardingComplete: boolean;
}

export interface SessionResponse {
  authenticated: true;
  user: SessionPayload;
}

export interface OnboardingCompleteBody {
  role: RoleId;
  subType?: SubType | null;
  context?: Record<string, unknown>;
  /** The entry path this journey ran from — recorded so it runs only once. */
  entryPath?: string | null;
  /** Template that drove this signup (for attribution). */
  templateId?: string | null;
  /** Referrer label from the /onboard?ref=... param. */
  ref?: string | null;
}

// ── GitHub OAuth API shapes ────────────────────────────────────────────────────
export interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}

// ── Google OAuth API shapes ────────────────────────────────────────────────────
export interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

export interface GoogleProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}
