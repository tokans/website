import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../server/lib/handler.js";

/**
 * Single serverless function for the entire `/api/*` surface.
 *
 * Vercel's zero-config Node builder turns EVERY file under `api/` into its own
 * serverless function. With ~30 routes + helpers that blew past the Hobby plan's
 * 12-function limit. So all the real handlers live under `server/` (which Vercel
 * does NOT functionize) and this one file dispatches to them — keeping the total
 * at a single function while leaving every public `/api/...` URL unchanged.
 *
 * Routing: zero-config `@vercel/node` does NOT expand a `[...path]` filename
 * into a multi-segment catch-all (it only matches one segment). So instead a
 * `rewrites` rule in `vercel.json` funnels every `/api/:path*` here as
 * `/api/router?__route=<path>`, and this function resolves `__route` to a
 * handler. The `req.url` parse is a dev/safety fallback.
 *
 * Each handler still owns its own method checks (405), CSRF, auth, etc. This
 * router only resolves the path to a handler, injects any `:id` path segment
 * into `req.query`, and delegates. It deliberately never touches `req.body`, so
 * `payments/webhook`'s raw-body reading is unaffected.
 */

import appsIndex from "../server/apps/index.js";
import appsById from "../server/apps/[id].js";
import appsRequestSupport from "../server/apps/[id]/request-support.js";
import authSignup from "../server/auth/signup.js";
import authSignin from "../server/auth/signin.js";
import authLogout from "../server/auth/logout.js";
import authGithub from "../server/auth/github.js";
import authGoogle from "../server/auth/google.js";
import authGithubCallback from "../server/auth/github-callback.js";
import authGoogleCallback from "../server/auth/google-callback.js";
import authSession from "../server/auth/session.js";
import csrf from "../server/csrf.js";
import connectionsIndex from "../server/connections/index.js";
import cronSnapshot from "../server/cron/snapshot.js";
import donateCheckout from "../server/donate/checkout.js";
import employerBrief from "../server/employer/brief.js";
import mwaInbox from "../server/mwa/inbox.js";
import mwaInboxById from "../server/mwa/inbox/[id].js";
import mwaInboxActions from "../server/mwa/inbox/[id]/actions.js";
import mwaInboxComments from "../server/mwa/inbox/[id]/comments.js";
import onboardingComplete from "../server/onboarding/complete.js";
import partnersIndex from "../server/partners/index.js";
import partnersById from "../server/partners/[id].js";
import paymentsWebhook from "../server/payments/webhook.js";
import proDownload from "../server/professionals/download.js";
import proOnboard from "../server/professionals/onboard.js";
import proStatus from "../server/professionals/status.js";
import proSubscribe from "../server/professionals/subscribe.js";
import proSubscription from "../server/professionals/subscription.js";
import tokanTaskIndex from "../server/tokan-task/index.js";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/** A `:name` segment is a capture; every other segment matches literally. */
interface Route {
  segs: string[];
  handler: Handler;
}

// Order is irrelevant: matching is by exact segment count, then literal-beats-
// param via `score`. Listed roughly by area for readability.
const ROUTES: Route[] = [
  { segs: ["apps"], handler: appsIndex },
  { segs: ["apps", ":id", "request-support"], handler: appsRequestSupport },
  { segs: ["apps", ":id"], handler: appsById },
  { segs: ["auth", "signup"], handler: authSignup },
  { segs: ["auth", "signin"], handler: authSignin },
  { segs: ["auth", "logout"], handler: authLogout },
  { segs: ["auth", "github"], handler: authGithub },
  { segs: ["auth", "google"], handler: authGoogle },
  { segs: ["auth", "github-callback"], handler: authGithubCallback },
  { segs: ["auth", "google-callback"], handler: authGoogleCallback },
  { segs: ["auth", "session"], handler: authSession },
  { segs: ["csrf"], handler: csrf },
  { segs: ["connections"], handler: connectionsIndex },
  { segs: ["cron", "snapshot"], handler: cronSnapshot },
  { segs: ["donate", "checkout"], handler: donateCheckout },
  { segs: ["employer", "brief"], handler: employerBrief },
  { segs: ["mwa", "inbox"], handler: mwaInbox },
  { segs: ["mwa", "inbox", ":id", "actions"], handler: mwaInboxActions },
  { segs: ["mwa", "inbox", ":id", "comments"], handler: mwaInboxComments },
  { segs: ["mwa", "inbox", ":id"], handler: mwaInboxById },
  { segs: ["onboarding", "complete"], handler: onboardingComplete },
  { segs: ["partners"], handler: partnersIndex },
  { segs: ["partners", ":id"], handler: partnersById },
  { segs: ["payments", "webhook"], handler: paymentsWebhook },
  { segs: ["professionals", "download"], handler: proDownload },
  { segs: ["professionals", "onboard"], handler: proOnboard },
  { segs: ["professionals", "status"], handler: proStatus },
  { segs: ["professionals", "subscribe"], handler: proSubscribe },
  { segs: ["professionals", "subscription"], handler: proSubscription },
  { segs: ["tokan-task"], handler: tokanTaskIndex },
];

/**
 * Segments after `/api/`. Primary source is the `__route` query param injected
 * by the `vercel.json` rewrite (`/api/:path*` → `/api/router?__route=<path>`),
 * which is a single `a/b/c` string. Falls back to parsing `req.url` (covers
 * `vercel dev` and any direct hit that bypasses the rewrite).
 */
function getPathSegs(req: VercelRequest): string[] {
  const r = req.query["__route"];
  const route = Array.isArray(r) ? r.join("/") : r;
  const raw =
    typeof route === "string" && route.length > 0
      ? route
      : (req.url ?? "").split("?")[0]?.replace(/^\/api\/?/, "") ?? "";
  return raw.split("/").filter((s) => s.length > 0);
}

interface Match {
  handler: Handler;
  params: Record<string, string>;
}

/** Exact segment-count match; a literal segment outscores a `:param` at a tie. */
function matchRoute(pathSegs: string[]): Match | null {
  let best: (Match & { score: number }) | null = null;

  for (const route of ROUTES) {
    if (route.segs.length !== pathSegs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    let score = 0;
    for (let i = 0; i < route.segs.length; i++) {
      const rs = route.segs[i];
      const ps = pathSegs[i];
      if (rs === undefined || ps === undefined) {
        ok = false;
        break;
      }
      if (rs.startsWith(":")) {
        params[rs.slice(1)] = ps;
      } else if (rs === ps) {
        score++;
      } else {
        ok = false;
        break;
      }
    }
    if (ok && (best === null || score > best.score)) {
      best = { handler: route.handler, params, score };
    }
  }
  return best === null ? null : { handler: best.handler, params: best.params };
}

export default withErrorHandling(async function dispatch(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const match = matchRoute(getPathSegs(req));
  if (match === null) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Inject captured path params as plain strings so handlers can read them via
  // `req.query.id` / `req.query["id"]` exactly as they did when file-routed.
  const q = req.query as Record<string, string | string[] | undefined>;
  for (const [key, value] of Object.entries(match.params)) {
    q[key] = value;
  }
  await match.handler(req, res);
});
