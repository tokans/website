/**
 * REST backend adapter — the website (web tier) talks to `tokans/backend` over
 * **REST**, never gRPC. (gRPC is reserved for the desktop myWorkAssistant app
 * talking to the backend directly.) Wired when the backend REST API exists and
 * `BACKEND_MODE=rest` + `BACKEND_REST_URL` are set; until then `mock` is default.
 *
 * Identity-forward: each call carries a short-lived signed identity token as an
 * HTTP `Authorization: Bearer …` header (the edge never forwards the raw session).
 */
import "../env.js";
import {
  BackendUnavailableError,
  type AppListing,
  type Auth,
  type BackendPort,
  type DownloadGrant,
  type NewTaskInput,
  type NewTaskResult,
  type ProfessionalOnboardInput,
  type ProfessionalStatus,
} from "./contract.js";
import { mintIdentityToken, type Identity } from "./identity.js";

export class RestBackend implements BackendPort {
  private base(): string {
    const u = process.env["BACKEND_REST_URL"];
    if (!u) {
      throw new BackendUnavailableError(
        "BACKEND_REST_URL is not set (backend REST API). Set BACKEND_MODE=mock to use the Neon-backed adapter."
      );
    }
    return u.replace(/\/+$/, "");
  }

  private async call<T>(
    identity: Identity,
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.base()}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mintIdentityToken(identity)}`,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new BackendUnavailableError(
        `Backend REST ${method} ${path} failed: ${res.status} ${detail}`
      );
    }
    return (await res.json()) as T;
  }

  resolveAuth(identity: Identity, schemaId: string): Promise<Auth> {
    return this.call<Auth>(identity, "GET", `/uam/auth?schemaId=${encodeURIComponent(schemaId)}`);
  }
  onboardProfessional(
    identity: Identity,
    input: ProfessionalOnboardInput
  ): Promise<ProfessionalStatus> {
    return this.call<ProfessionalStatus>(identity, "POST", "/professionals/onboard", input);
  }
  getProfessionalStatus(identity: Identity): Promise<ProfessionalStatus> {
    return this.call<ProfessionalStatus>(identity, "GET", "/professionals/status");
  }
  grantDownload(identity: Identity): Promise<DownloadGrant> {
    return this.call<DownloadGrant>(identity, "POST", "/professionals/download", {});
  }
  requestAppSupport(identity: Identity, appId: string): Promise<AppListing> {
    return this.call<AppListing>(
      identity,
      "POST",
      `/apps/${encodeURIComponent(appId)}/request-support`,
      {}
    );
  }
  createWorkItem(identity: Identity, input: NewTaskInput): Promise<NewTaskResult> {
    return this.call<NewTaskResult>(identity, "POST", "/workflow/work-items", input);
  }
}
