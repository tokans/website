/**
 * Backend client entry point (P0 seam).
 *
 * `getBackend()` returns the active {@link BackendPort} adapter:
 *   • BACKEND_MODE=mock (default) → Neon-backed {@link MockBackend} — works today.
 *   • BACKEND_MODE=grpc           → {@link GrpcBackend} — the real wire to
 *                                   `tokans/backend`, stubbed until BE P0 ships
 *                                   its proto (generated from the hyperclaw schemas).
 *
 * Identity-forward: every backend call carries a short-lived signed identity
 * token (gRPC metadata) minted by {@link mintIdentityToken}. The edge never
 * forwards the raw session — only this 2-minute assertion.
 */
import "./env.js";
import { MockBackend } from "./backend/mock.js";
import { BackendUnavailableError } from "./backend/contract.js";
import { mintIdentityToken, type Identity } from "./backend/identity.js";
import type {
  Auth,
  BackendPort,
  DownloadGrant,
  ProfessionalOnboardInput,
  ProfessionalStatus,
} from "./backend/contract.js";

// ── gRPC adapter (wired when tokans/backend BE P0 lands) ──────────────────────
class GrpcBackend implements BackendPort {
  constructor(private readonly addr: string) {}

  /** gRPC metadata for the call — the identity-forward token. */
  private authMetadata(identity: Identity): Record<string, string> {
    return { authorization: `Bearer ${mintIdentityToken(identity)}` };
  }

  private fail(): Promise<never> {
    return Promise.reject(
      new BackendUnavailableError(
        `gRPC backend not wired yet (addr=${this.addr}). ` +
          "BE P0 (proto generated from hyperclaw 03_uam.yaml / 04_workflow.yaml) is pending. " +
          "Set BACKEND_MODE=mock to use the Neon-backed adapter."
      )
    );
  }

  resolveAuth(identity: Identity, _schemaId: string): Promise<Auth> {
    void this.authMetadata(identity);
    return this.fail();
  }
  onboardProfessional(
    identity: Identity,
    _input: ProfessionalOnboardInput
  ): Promise<ProfessionalStatus> {
    void this.authMetadata(identity);
    return this.fail();
  }
  getProfessionalStatus(identity: Identity): Promise<ProfessionalStatus> {
    void this.authMetadata(identity);
    return this.fail();
  }
  grantDownload(identity: Identity): Promise<DownloadGrant> {
    void this.authMetadata(identity);
    return this.fail();
  }
}

let _backend: BackendPort | null = null;

export function getBackend(): BackendPort {
  if (_backend) return _backend;
  const mode = (process.env["BACKEND_MODE"] ?? "mock").toLowerCase();
  if (mode === "grpc") {
    _backend = new GrpcBackend(process.env["BACKEND_GRPC_ADDR"] ?? "localhost:50051");
  } else {
    _backend = new MockBackend();
  }
  return _backend;
}

export {
  mintIdentityToken,
  verifyIdentityToken,
  identityFromSession,
} from "./backend/identity.js";
export type { Identity } from "./backend/identity.js";
export {
  BackendUnavailableError,
} from "./backend/contract.js";
export type {
  BackendPort,
  Auth,
  ProfessionalStatus,
  ProfessionalStatusKind,
  ProfessionalOnboardInput,
  DownloadGrant,
  RoleCategory,
  AccessLevel,
} from "./backend/contract.js";
