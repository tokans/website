import { useEffect, useRef, useState } from "react";
import type { SessionPayload } from "../lib/types.js";

/**
 * Hosts the myWorkAssistant cockpit at /myWorkAssistant.
 *
 * myWorkAssistant is an independent app shipped as a self-contained, mountable
 * bundle. It mounts into its OWN React 18 root inside the container below, so it
 * never shares this site's React 19 tree, and it talks to the same-origin REST
 * api (`/api`) using the host's session cookie.
 *
 * The prebuilt bundle is vendored under `public/vendor/myworkassistant/` (see
 * `npm run sync:mwa`) and loaded at runtime by URL — NOT as a bundled import —
 * so Vite/Rolldown never has to resolve it at build time. Loading by URL also
 * lets the browser resolve the bundle's own sibling chunks relative to its URL.
 */
const MWA_BASE = "/vendor/myworkassistant";
const MWA_JS_URL = `${MWA_BASE}/myworkassistant.js`;
const MWA_CSS_URL = `${MWA_BASE}/myworkassistant.css`;

interface MwaSessionUser {
  id: string;
  email?: string | undefined;
  name?: string | undefined;
  role?: string | undefined;
}
interface MwaMountOptions {
  session?: MwaSessionUser | null | undefined;
  apiBaseUrl?: string | undefined;
  basename?: string | undefined;
}
interface MwaModule {
  mount: (el: HTMLElement, opts?: MwaMountOptions) => () => void;
}

/** Inject the bundle's stylesheet once (idempotent). */
function ensureMwaStyles(): void {
  if (document.querySelector(`link[data-mwa-style]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MWA_CSS_URL;
  link.dataset.mwaStyle = "true";
  document.head.appendChild(link);
}

export default function MwaMount({ user }: { user: SessionPayload }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unmount: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        // Load the bundle + its stylesheet on demand, by URL. The @vite-ignore
        // keeps the bundler from trying to resolve/transform it at build time.
        ensureMwaStyles();
        const { mount } = (await import(
          /* @vite-ignore */ MWA_JS_URL
        )) as MwaModule;
        if (cancelled || !ref.current) return;
        unmount = mount(ref.current, {
          session: {
            id: user.userId,
            email: user.email,
            name: user.name ?? undefined,
            role: user.role,
          },
          apiBaseUrl: "/api",
          basename: "/myWorkAssistant",
        });
      } catch (e) {
        console.error("Failed to load myWorkAssistant bundle:", e);
        if (!cancelled) setError("Could not load myWorkAssistant.");
      }
    })();

    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [user]);

  if (error) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        {error}
      </div>
    );
  }
  return <div ref={ref} style={{ height: "100vh", width: "100%" }} />;
}
