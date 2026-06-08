/**
 * Use-case panels for React content pages that use PageLayout (/tokan-task; the
 * partners entry is also exercised by site.test). Same shape as the auth panels —
 * an image + context text shown beside the page's content/CTA. Keyed by `flow`.
 * Note: /apps, /partners and /donate are now standalone static HTML pages whose
 * use-case copy lives directly in their shells, not here.
 */
export interface PageContext {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  points: string[];
}

export const PAGE_CONTEXTS: Record<string, PageContext> = {
  partners: {
    image: "/images/mentor.png",
    imageAlt: "Verified professionals on the Tokans network",
    eyebrow: "THE PARTNER NETWORK",
    title: "Connect with a professional",
    subtitle:
      "Verified professionals across every discipline — engineers, designers, data, product and more. Reach out and your request lands directly in their work inbox.",
    points: [
      "Privacy-preserving — browse without sharing any PII",
      "Connecting creates a task routed to their inbox",
      "Professionals of every type, vetted by contribution",
    ],
  },

  "tokan-task": {
    image: "/images/phone.png",
    imageAlt: "Review a profile and earn your first Tokan",
    eyebrow: "YOUR FIRST TOKAN TASK",
    title: "Review. Earn your first Tokan.",
    subtitle:
      "Read an anonymised profile and answer five short questions. You're helping another engineer be seen clearly — and starting your own record.",
    points: [
      "~8 minutes, five short questions",
      "Anonymised — judged on contribution, not identity",
      "Earns your very first Tokan",
    ],
  },
};
