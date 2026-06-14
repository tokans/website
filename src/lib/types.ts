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

export interface OnboardingTemplate {
  id: string;
  name: string;
  valHash: string;
  role: string;
  subType: string | null;
  context: Record<string, unknown>;
  createdAt?: string;
}

export interface OnboardingCompleteResult {
  ok: boolean;
  /** true = email found (scraped or README) and verification email already sent */
  verificationSent?: boolean;
  /** email address we found and sent the verification to */
  scrapedEmail?: string;
  /** domain the user must match when entering their own email */
  emailDomain?: string;
  /** GitHub URL matched the user's connected GitHub account — no email needed */
  autoVerified?: boolean;
  /** GitHub project URL detected but user hasn't connected GitHub OAuth yet */
  needsGithubAuth?: boolean;
  /** redirect path — e.g. "/patrons" for donor role */
  redirect?: string;
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

// ── Professionals (P0) — mirrors server/lib/backend/contract.ts ──────────────────
export type RoleCategory =
  | "Customer"
  | "Employee"
  | "Partner"
  | "Contractor"
  | "Automaton";

export type ProfessionalStatusKind = "none" | "pending" | "approved";

export interface ProfessionalStatus {
  onboarded: boolean;
  profession: string | null;
  roleName: string | null;
  category: RoleCategory | null;
  subType: string | null;
  status: ProfessionalStatusKind;
  subscribed: boolean;
  downloadEligible: boolean;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: string | null;
  status: string;
  currentPeriodEnd: string | null;
}

// ── Apps support directory (P1) ───────────────────────────────────────────────
export type AppSupportStatus = "none" | "requested" | "accepted" | "listed";

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
  isOwner: boolean;
}

export interface AppRegisterBody {
  name: string;
  slug?: string;
  tagline?: string | null;
  repoUrl?: string | null;
  stack?: string | null;
  description?: string | null;
  usesSharedCoreLib?: boolean;
  siteUrl?: string | null;
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

export interface ConnectionResult {
  connectionId: string;
  workItemId: string;
  status: string;
}

// ── First Tokan Task + employer brief (P1) ────────────────────────────────────
export interface SeedProfile {
  id: string;
  headline: string;
  skills: string[];
  summary: string;
  claims: string[];
}

export interface TokanTaskAnswers {
  strongestSkill: string;
  unverifiableClaim: string;
  wouldWorkWith: string;
  missing: string;
  confidence: "low" | "medium" | "high";
}

export interface EmployerBriefBody {
  whatTheyOwn?: string | null;
  successAt60Days?: string | null;
  technicalBottleneck?: string | null;
  pastHiringAttempts?: string | null;
  technicalSetup?: string | null;
  engagementType?: string | null;
  budgetRange?: string | null;
}

export interface DownloadGrant {
  eligible: boolean;
  url: string | null;
  token: string | null;
  reason: string | null;
}

export interface ProfessionalOnboardBody {
  profession: string;
  subType?: string | null;
  answers?: Record<string, unknown>;
}
