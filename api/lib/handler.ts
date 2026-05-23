import type { VercelRequest, VercelResponse } from "@vercel/node";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/**
 * Catches unhandled errors so that `vercel dev` doesn't crash on a single
 * faulty request, and so production returns a clean 500 instead of leaking
 * a stack trace. Errors are still logged.
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[api] ${req.method} ${req.url} failed:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}
