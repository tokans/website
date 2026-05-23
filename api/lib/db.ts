import { neon, neonConfig, NeonQueryFunction } from "@neondatabase/serverless";
import "./env.js";

let _sql: NeonQueryFunction<false, false> | null = null;

// When LOCAL_DB=1 (see .env.development.local), route the driver at the
// local neon-proxy container instead of api.<region>.aws.neon.tech.
// Keeps prod untouched — Vercel never sets LOCAL_DB.
if (process.env["LOCAL_DB"] === "1") {
  neonConfig.fetchEndpoint = (host, port) => `http://${host}:${port}/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    _sql = neon(url);
  }
  return _sql;
}
