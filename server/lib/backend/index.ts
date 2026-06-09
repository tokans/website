/**
 * Backend client entry point (web tier → REST).
 *
 * `getBackend()` returns the active {@link BackendPort} adapter:
 *   • BACKEND_MODE=mock (default) → Neon-backed {@link MockBackend} — works today.
 *   • BACKEND_MODE=rest           → {@link RestBackend} — HTTP to `tokans/backend`
 *                                   (set `BACKEND_REST_URL`).
 *
 * The website uses **REST**, not gRPC — gRPC is reserved for the desktop
 * myWorkAssistant app talking to the backend directly. Identity-forward: each
 * call carries a short-lived signed token (mint via {@link mintIdentityToken}).
 */
import "../env.js";
import { MockBackend } from "./mock.js";
import { RestBackend } from "./rest.js";
import type { BackendPort } from "./contract.js";

let _backend: BackendPort | null = null;

export function getBackend(): BackendPort {
  if (_backend) return _backend;
  const mode = (process.env["BACKEND_MODE"] ?? "mock").toLowerCase();
  _backend = mode === "rest" ? new RestBackend() : new MockBackend();
  return _backend;
}

export {
  mintIdentityToken,
  verifyIdentityToken,
  identityFromSession,
} from "./identity.js";
export type { Identity } from "./identity.js";
export { BackendUnavailableError } from "./contract.js";
export type {
  BackendPort,
  Auth,
  ProfessionalStatus,
  ProfessionalStatusKind,
  ProfessionalOnboardInput,
  DownloadGrant,
  RoleCategory,
  AccessLevel,
  AppListing,
  AppSupportStatus,
  PartnerListing,
  NewTaskInput,
  NewTaskResult,
} from "./contract.js";
