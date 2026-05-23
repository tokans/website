import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureCsrfToken } from "./lib/csrf.js";
import { withErrorHandling } from "./lib/handler.js";

export default withErrorHandling(function handler(
  req: VercelRequest,
  res: VercelResponse
): void {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const token = ensureCsrfToken(req, res);
  res.status(200).json({ csrfToken: token });
});
