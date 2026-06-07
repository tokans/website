import { useEffect, useRef, useState } from "react";
import type { SessionPayload } from "../lib/types.js";

/**
 * Hosts the myWorkAssistant cockpit at /myWorkAssistant.
 *
 * myWorkAssistant is an independent app published as a mountable bundle
 * (`myworkassistant/embed`). It mounts into its OWN React 18 root inside the
 * container below, so it never shares this site's React 19 tree. The bundle is
 * loaded lazily so it costs nothing on the rest of the site, and it talks to the
 * same-origin REST api (`/api`) using the host's session cookie.
 */
export default function MwaMount({ user }: { user: SessionPayload }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unmount: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        // Load the bundle + its stylesheet on demand.
        const [{ mount }] = await Promise.all([
          import("myworkassistant/embed"),
          import("myworkassistant/embed/style.css"),
        ]);
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
