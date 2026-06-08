/**
 * Use-case panels for the split auth screen. When a visitor lands on a
 * role-scoped entry point (/professionals, /join, /hire …) the signup/signin
 * form sits on the right and a use-case-specific panel (image + copy) sits on
 * the left, explaining what *that* link is for. Keyed by the App `flow` value.
 */
export interface AuthContext {
  /** Brand-side image (served from /public/images). */
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  points: string[];
  /** Which tab the form should default to for this entry point. */
  defaultView: "login" | "signup";
}

export const AUTH_CONTEXTS: Record<string, AuthContext> = {
  // Partner signup → /partners listing + subscribe → desktop download.
  professionals: {
    image: "/images/architect.png",
    imageAlt: "A professional building with Tokans",
    eyebrow: "FOR PROFESSIONALS",
    title: "Join the partner network",
    subtitle:
      "Get profiled by your profession, listed across the Tokans suite, and unlock the myWorkAssistant desktop cockpit.",
    points: [
      "Profile your profession with a guided, role-specific form",
      "Get listed as a verified Partner — privacy-preserving, no PII",
      "Unlock the myWorkAssistant download with an active subscription",
      "Receive client connection requests in your work inbox",
    ],
    defaultView: "signup",
  },

  // Supply side — Opportunity Seeker (job-seeking engineers).
  join: {
    image: "/images/coding.png",
    imageAlt: "An engineer working on real code",
    eyebrow: "FOR ENGINEERS",
    title: "Get matched on proof, not résumés",
    subtitle:
      "Build a verified Tokan profile, complete your First Tokan Task, and get shortlisted by employers who value contribution.",
    points: [
      "Prove your track record on real codebases, not just greenfield",
      "Earn your first Tokan through anonymized peer review",
      "Get shortlisted by employers who are actively hiring",
      "Privacy-first — you stay anonymous until you choose to connect",
    ],
    defaultView: "signup",
  },

  // Founders listing a vibe-coded app for Tokans support (gated → Apps screen).
  founders: {
    image: "/images/founder.png",
    imageAlt: "A founder shipping their app",
    eyebrow: "FOR FOUNDERS",
    title: "Take your AI-built app further",
    subtitle:
      "List your vibe-coded app for Tokans support and connect with verified engineers who take over real codebases, not just greenfield.",
    points: [
      "List your app built on sharedCoreLib for Tokans support",
      "Get matched with engineers who scale, not just scaffold",
      "Initiate the acceptance workflow to get your app listed",
      "Your v1 is real — your next engineer should be too",
    ],
    defaultView: "signup",
  },

  // Demand side — Employer (NOT a professional signup).
  hire: {
    image: "/images/shakehands.png",
    imageAlt: "Founders and engineers shaking hands",
    eyebrow: "FOR FOUNDERS & EMPLOYERS",
    title: "Hire engineers verified by contribution",
    subtitle:
      "Tell us what you need in a short brief and receive a shortlist of engineers with a proven track record of scaling real products.",
    points: [
      "Answer a focused 7-question hiring brief",
      "Get matched to engineers proven on real codebases",
      "See computed Tokan scores — never raw, scrapeable metrics",
      "Design-partner support through your first hires",
    ],
    defaultView: "signup",
  },
};

export function getAuthContext(flow: string | undefined): AuthContext | undefined {
  if (!flow) return undefined;
  return AUTH_CONTEXTS[flow];
}
