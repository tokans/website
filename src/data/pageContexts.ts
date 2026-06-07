/**
 * Use-case panels for the public content pages (/partners, /apps, /donate,
 * /tokan-task). Same shape as the auth panels — an image + context text shown
 * beside the page's content/CTA. Keyed by the App `flow` value.
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

  apps: {
    image: "/images/dev.png",
    imageAlt: "Apps built on sharedCoreLib",
    eyebrow: "APPS ON THE TOKANS NETWORK",
    title: "Apps supported by professionals",
    subtitle:
      "Apps built on sharedCoreLib can be listed here so the partner network can support them. Browse the directory, or list your own.",
    points: [
      "Every sharedCoreLib app is eligible to be listed",
      "Owners initiate an acceptance workflow to get listed",
      "Supported by verified professionals on the network",
    ],
  },

  donate: {
    image: "/images/profile.png",
    imageAlt: "Pay-it-forward support for professionals",
    eyebrow: "SUPPORT THE MISSION",
    title: "Pay it forward",
    subtitle:
      "Fund access and support for professionals rebuilding their careers in the AI era. AI needs Tokens. Humans need Tokans.",
    points: [
      "Anonymous-friendly — no account required",
      "Funds professional access and support",
      "Every contribution is pay-it-forward",
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

export function getPageContext(flow: string | undefined): PageContext | undefined {
  if (!flow) return undefined;
  return PAGE_CONTEXTS[flow];
}
